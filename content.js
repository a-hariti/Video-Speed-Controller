const SPEED_INCREMENTS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 2.75, 3, 3.25, 3.5];
const YOUTUBE_UI_MAX_RATE = 2;
let youtubeLastKnownSpeed = null;
let youtubeMenuObserver = null;
let youtubeSyncScheduled = false;
let youtubeObservedPlayerRoot = null;

document.addEventListener(
  "keydown",
  ifNoInputFocus(adjustPlaybackSpeed),
  // capture phase to prevent the event from being handled by the default YouTube handler
  true,
);

/**
 * Adjusts the playback speed of the currently playing video/audio element
 * @param {KeyboardEvent} event - The keyboard event that triggered the speed change
 * @returns {void}
 */
function adjustPlaybackSpeed(event) {
  /**
   * @type {"increase" | "decrease" | null}
   */
  let direction = null;
  // Check for Shift + > (increase speed)
  if (event.shiftKey && event.key === ">") {
    direction = "increase";
  }

  // Check for Shift + < (decrease speed)
  if (event.shiftKey && event.key === "<") {
    direction = "decrease";
  }

  if (!direction) return;

  // Find all video and audio elements
  const mediaElements = [
    ...document.getElementsByTagName("video"),
    ...document.getElementsByTagName("audio"),
  ];

  if (mediaElements.length === 0) return;

  // Set playback speed for the currently playing element
  const playingElement = mediaElements.find((media) => !media.paused);
  if (!playingElement) {
    return;
  }
  const currentSpeed = playingElement.playbackRate;

  const newSpeed =
    direction === "increase"
      ? SPEED_INCREMENTS.find((speed) => speed > currentSpeed)
      : // Find the last speed that's immediately less than the current speed
        SPEED_INCREMENTS.findLast((speed) => speed < currentSpeed);

  const isYouTube = window.location.hostname.includes("youtube.com");
  if (isYouTube) {
    ensureYouTubeMenuSyncObserver();
    youtubeLastKnownSpeed = currentSpeed;
    hideYouTubeSpeedIndicator();
    hideYouTubeCustomSpeedControls();
  }
  if (!newSpeed) {
    if (isYouTube) {
      // At custom boundaries (e.g. already at 3.5x), swallow shortcut so
      // YouTube doesn't show a native 2x speed popup.
      event.preventDefault();
      event.stopImmediatePropagation();
      youtubeLastKnownSpeed = currentSpeed;
      syncYouTubeDisplayedSpeed(currentSpeed);
      showSpeedOverlay(currentSpeed);
    }
    return;
  }
  const canUseNativeYouTubeShortcut =
    isYouTube &&
    currentSpeed <= YOUTUBE_UI_MAX_RATE &&
    newSpeed <= YOUTUBE_UI_MAX_RATE;

  if (canUseNativeYouTubeShortcut) {
    // Let YouTube handle its native shortcut so the cog menu UI stays in sync.
    youtubeLastKnownSpeed = newSpeed;
    syncYouTubeDisplayedSpeed(newSpeed);
    showSpeedOverlay(newSpeed);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const wasHandledByYouTube = isYouTube
    ? setYouTubePlaybackSpeed(newSpeed, playingElement)
    : false;

  if (!wasHandledByYouTube) {
    // Fallback for non-YouTube sites and speeds above YouTube's UI max.
    playingElement.playbackRate = newSpeed;
  }

  if (isYouTube) {
    youtubeLastKnownSpeed = newSpeed;
    syncYouTubeDisplayedSpeed(newSpeed);
    showSpeedOverlay(newSpeed);
    return;
  }

  // Non-YouTube: show extension overlay.
  showSpeedOverlay(newSpeed);
}

/**
 * Sets YouTube playback speed through the player API so the UI stays in sync.
 * Returns false when the target speed is outside YouTube's supported UI range.
 * @param {number} targetSpeed
 * @param {HTMLMediaElement} fallbackMediaElement
 * @returns {boolean}
 */
function setYouTubePlaybackSpeed(targetSpeed, fallbackMediaElement) {
  if (targetSpeed > YOUTUBE_UI_MAX_RATE) return false;

  const player =
    document.getElementById("movie_player") ||
    document.querySelector(".html5-video-player");
  if (!player || typeof player.setPlaybackRate !== "function") {
    return false;
  }

  player.setPlaybackRate(targetSpeed);
  // Keep DOM media rate in sync and trigger observers that rely on ratechange.
  const mainVideo =
    document.querySelector("video.html5-main-video") || fallbackMediaElement;
  if (mainVideo) {
    mainVideo.playbackRate = targetSpeed;
    mainVideo.dispatchEvent(new Event("ratechange", { bubbles: true }));
  }
  return true;
}

/**
 * Hides YouTube native speed popups/bezel overlays.
 * @returns {void}
 */
function hideYouTubeSpeedIndicator() {
  const styleId = "video-xspeed-youtube-speed-overlay-hide";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .ytp-bezel,
    .ytp-bezel-text-wrapper,
    .ytp-speedmaster-overlay,
    .ytp-speedmaster-user-edu {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Hides YouTube custom float speed controls so only discrete clickable options remain.
 * @returns {void}
 */
function hideYouTubeCustomSpeedControls() {
  const styleId = "video-xspeed-youtube-custom-speed-controls-hide";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .ytp-settings-menu .ytp-panel-menu .ytp-speed-slider-menu-footer,
    .ytp-settings-menu .ytp-panel-menu .ytp-speedslider,
    .ytp-settings-menu .ytp-panel-menu .ytp-input-slider-section,
    .ytp-settings-menu .ytp-panel-menu .ytp-speedslider-indicator-container,
    .ytp-settings-menu .ytp-panel-menu .ytp-drc-slider,
    .ytp-settings-menu .ytp-panel-menu .ytp-drc-controls,
    .ytp-settings-menu .ytp-panel-menu .ytp-drc-slider-container {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Ensures YouTube menu text is re-synced when controls/settings DOM rerenders.
 * @returns {void}
 */
function ensureYouTubeMenuSyncObserver() {
  const playerRoot = document.querySelector(".html5-video-player");
  if (!playerRoot) return;
  if (youtubeMenuObserver && youtubeObservedPlayerRoot === playerRoot) return;
  if (youtubeMenuObserver) {
    youtubeMenuObserver.disconnect();
    youtubeMenuObserver = null;
    youtubeObservedPlayerRoot = null;
  }

  youtubeMenuObserver = new MutationObserver(() => {
    scheduleYouTubeDisplayedSpeedSync();
  });
  youtubeMenuObserver.observe(playerRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-expanded", "aria-hidden"],
  });
  youtubeObservedPlayerRoot = playerRoot;
}

/**
 * Batches YouTube menu sync calls while the player DOM is updating.
 * @returns {void}
 */
function scheduleYouTubeDisplayedSpeedSync() {
  if (youtubeSyncScheduled || youtubeLastKnownSpeed === null) return;
  youtubeSyncScheduled = true;
  setTimeout(() => {
    youtubeSyncScheduled = false;
    if (youtubeLastKnownSpeed === null) return;
    syncYouTubeDisplayedSpeed(youtubeLastKnownSpeed);
  }, 0);
}

/**
 * Updates YouTube settings UI labels to reflect the actual current playback speed.
 * This is mainly needed for custom speeds above YouTube's native 2x UI limit.
 * @param {number} speed
 * @returns {void}
 */
function syncYouTubeDisplayedSpeed(speed) {
  const playerRoot = document.querySelector(".html5-video-player");
  if (!playerRoot) return;

  const rowValueLabel = formatYouTubeRowValue(speed);

  const apply = () => {
    // Cog menu row: find the exact item whose label is "Playback speed".
    const menuItems = [...playerRoot.querySelectorAll(".ytp-panel-menu .ytp-menuitem")];
    for (const item of menuItems) {
      const label = item.querySelector(".ytp-menuitem-label");
      if (!label) continue;
      if ((label.textContent || "").trim() !== "Playback speed") continue;
      const valueCell = item.querySelector(".ytp-menuitem-content");
      if (valueCell) {
        valueCell.textContent = rowValueLabel;
      }
      break;
    }
  };

  apply();
  // YouTube often rerenders menu nodes right after key handling.
  setTimeout(apply, 0);
  setTimeout(apply, 50);
}

/**
 * Formats playback speed for the cog menu row value.
 * Snapshot shows YouTube uses "2" (without x) in that row.
 * @param {number} speed
 * @returns {string}
 */
function formatYouTubeRowValue(speed) {
  if (speed === 1) return "Normal";
  return Number(speed.toFixed(2)).toString();
}

/**
 * Shows a temporary overlay with the current playback speed
 * @param {number} speed - The current playback speed to display
 */
function showSpeedOverlay(speed) {
  const existingOverlay = document.getElementById("speed-overlay");
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }

  // Create new overlay
  const overlay = document.createElement("div");
  overlay.id = "speed-overlay";
  overlay.style.position = "fixed";
  overlay.style.bottom = "0px";
  overlay.style.left = "0px";
  overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
  overlay.style.color = "white";
  overlay.style.fontFamily = "Roboto, sans-serif";
  overlay.style.fontSize = "10px";
  overlay.style.padding = "10px";
  overlay.style.borderRadius = "5px";
  overlay.style.zIndex = "1000000";
  overlay.textContent = `▶︎ ${speed}X`;

  document.body.appendChild(overlay);

  // Remove overlay after 1.2 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 1200);
}

/**
 * Higher-order function that only executes the callback if no input/textarea is focused
 * @param {(event: KeyboardEvent) => void} callback - The function to execute if no input is focused
 * @returns {(event: KeyboardEvent) => void} A wrapped function that checks focus before executing
 */
function ifNoInputFocus(callback) {
  return (event) => {
    const activeElement = document.activeElement;
    if (!activeElement) {
      return;
    }
    if (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.getAttribute("contenteditable") === "true"
    ) {
      // allow typing < and >
      return;
    }
    callback(event);
  };
}
