// Earny Content Script
// Detects video playback on YouTube and Twitch

let videoElement = null;
let observer = null;

// Detect platform
function getPlatform() {
  if (window.location.hostname.includes("youtube.com")) return "youtube";
  if (window.location.hostname.includes("twitch.tv")) return "twitch";
  return null;
}

// Find video element
function findVideo() {
  const platform = getPlatform();

  if (platform === "youtube") {
    return document.querySelector("video.html5-main-video");
  } else if (platform === "twitch") {
    return document.querySelector("video");
  }

  return null;
}

// Handle video play
function onVideoPlay() {
  chrome.runtime.sendMessage({ action: "videoPlaying" });
}

// Handle video pause
function onVideoPause() {
  chrome.runtime.sendMessage({ action: "videoPaused" });
}

// Handle video ended
function onVideoEnded() {
  chrome.runtime.sendMessage({ action: "videoEnded" });
}

// Attach listeners to video element
function attachVideoListeners(video) {
  if (!video || video === videoElement) return;

  // Remove old listeners if any
  if (videoElement) {
    videoElement.removeEventListener("play", onVideoPlay);
    videoElement.removeEventListener("pause", onVideoPause);
    videoElement.removeEventListener("ended", onVideoEnded);
  }

  videoElement = video;

  video.addEventListener("play", onVideoPlay);
  video.addEventListener("pause", onVideoPause);
  video.addEventListener("ended", onVideoEnded);

  // If video is already playing, notify
  if (!video.paused) {
    onVideoPlay();
  }
}

// Pause the video (called when out of credits)
function pauseVideo() {
  if (videoElement) {
    videoElement.pause();
    showOutOfCreditsOverlay();
  }
}

// Show overlay when out of credits
function showOutOfCreditsOverlay() {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById("earny-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "earny-overlay";
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">⏸️</div>
      <h1 style="font-size: 32px; margin: 0 0 16px 0;">Out of Credits!</h1>
      <p style="font-size: 18px; color: #aaa; margin: 0 0 24px 0; text-align: center; max-width: 400px;">
        You've run out of Earny credits. Log some fitness activities to earn more!
      </p>
      <button id="earny-dismiss" style="
        background: #6366f1;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        font-weight: 500;
      ">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("earny-dismiss").addEventListener("click", () => {
    overlay.remove();
  });
}

// Watch for video element changes (SPAs like YouTube)
function setupObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(() => {
    const video = findVideo();
    if (video) {
      attachVideoListeners(video);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pauseVideo") {
    pauseVideo();
    sendResponse({ paused: true });
  }
  return true;
});

// Initialize
function init() {
  const platform = getPlatform();
  if (!platform) return;

  // Try to find video immediately
  const video = findVideo();
  if (video) {
    attachVideoListeners(video);
  }

  // Set up observer for dynamic content
  setupObserver();
}

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Re-init on URL changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true });
