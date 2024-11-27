const SPEED_INCREMENTS = [1, 1.5, 1.75, 2, 2.5, 3, 3.5];
let currentSpeedIndex = 0;

function showSpeedOverlay(speed) {
  const existingOverlay = !!document.getElementById('speed-overlay');
  

  // Create new overlay
  const overlay = document.createElement('div');
  overlay.id = 'speed-overlay';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '0px';
  overlay.style.left = '0px';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
  overlay.style.color = 'white';
  overlay.style.fontFamily = 'Roboto, sans-serif';
  overlay.style.fontSize = '10px';
  overlay.style.padding = '10px';
  overlay.style.borderRadius = '5px';
  overlay.style.zIndex = '10000';
  overlay.textContent = `▶︎ ${speed}X`;

  document.body.appendChild(overlay);

  // Remove overlay after 2 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 1200);
}

function adjustPlaybackSpeed(direction) {
  // Find all video and audio elements
  const mediaElements = [
    ...document.getElementsByTagName('video'),
    ...document.getElementsByTagName('audio')
  ];

  if (mediaElements.length === 0) return;

  // Adjust speed index
  if (direction === 'increase') {
    currentSpeedIndex = Math.min(currentSpeedIndex + 1, SPEED_INCREMENTS.length - 1);
  } else {
    currentSpeedIndex = Math.max(currentSpeedIndex - 1, 0);
  }

  const newSpeed = SPEED_INCREMENTS[currentSpeedIndex];

  // Set playback speed for all media elements
  const playingElement = mediaElements.find(media => !media.paused);
  if (playingElement) {
    playingElement.playbackRate = newSpeed;
  }

  // Hide YouTube's speed indicator if we're on YouTube
  if (window.location.hostname.includes('youtube.com')) {
    const style = document.createElement('style');
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
  showSpeedOverlay(newSpeed);
}

document.addEventListener('keydown', (event) => {
  // Check for Shift + > (increase speed)
  if (event.shiftKey && event.key === '>') {
    event.preventDefault();
    adjustPlaybackSpeed('increase');
    event.stopImmediatePropagation();
  }
  
  // Check for Shift + < (decrease speed)
  if (event.shiftKey && event.key === '<') {
    event.preventDefault();
    adjustPlaybackSpeed('decrease');
    event.stopImmediatePropagation();
  }
});
