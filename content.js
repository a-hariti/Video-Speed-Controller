const SPEED_INCREMENTS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5];

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
  overlay.style.zIndex = "10000";
  overlay.textContent = `▶︎ ${speed}X`;

  document.body.appendChild(overlay);

  // Remove overlay after 1.2 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 1200);
}

function adjustPlaybackSpeed(event) {
  let direction;
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

  if (newSpeed) {
    playingElement.playbackRate = newSpeed;
    event.stopImmediatePropagation();
  }

  // Hide YouTube's speed indicator if we're on YouTube
  if (window.location.hostname.includes("youtube.com")) {
    const style = document.createElement("style");
    style.textContent = `
      .ytp-bezel-text-wrapper,
      .ytp-bezel {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    // Remove the style after the animation would have finished
    setTimeout(() => style.remove(), 1000);
  }

  // Show speed overlay
  showSpeedOverlay(playingElement.playbackRate);
}

document.addEventListener(
  "keydown",
  ifNoInputFocus(adjustPlaybackSpeed),
  // capture phase to prevent the event from being handled by the Youtube handler
  true
);

// only run if no input/textarea is focused
function ifNoInputFocus(callback) {
  return (event) => {
    const activeElement = document.activeElement;
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
