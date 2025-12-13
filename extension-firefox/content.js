// Earny Content Script
// Detects video playback on YouTube and Twitch

let videoElement = null;
let observer = null;
let isBlocked = false;
let videoCheckInterval = null;

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

// Track last known playing state to avoid duplicate messages
let lastPlayingState = null;

// Check video state and notify background
function checkVideoState() {
  const video = findVideo();
  console.log("[Earny] checkVideoState - video found:", !!video);

  if (!video) {
    if (lastPlayingState !== false) {
      console.log("[Earny] No video found, sending videoPaused");
      lastPlayingState = false;
      chrome.runtime.sendMessage({ action: "videoPaused" });
    }
    return;
  }

  videoElement = video;
  const isPlaying = !video.paused && !video.ended;
  console.log("[Earny] Video state - paused:", video.paused, "ended:", video.ended, "isPlaying:", isPlaying, "lastState:", lastPlayingState);

  if (isPlaying !== lastPlayingState) {
    lastPlayingState = isPlaying;
    if (isPlaying) {
      console.log("[Earny] State changed -> PLAYING, sending videoPlaying");
      chrome.runtime.sendMessage({ action: "videoPlaying" });
    } else {
      console.log("[Earny] State changed -> PAUSED, sending videoPaused");
      chrome.runtime.sendMessage({ action: "videoPaused" });
    }
  }
}

// Start polling for video state
function startVideoPolling() {
  if (videoCheckInterval) {
    console.log("[Earny] Polling already running");
    return;
  }

  console.log("[Earny] Starting video polling");
  // Check immediately, then every 2 seconds
  checkVideoState();
  videoCheckInterval = setInterval(checkVideoState, 2000);
}

// Stop polling
function stopVideoPolling() {
  if (videoCheckInterval) {
    console.log("[Earny] Stopping video polling");
    clearInterval(videoCheckInterval);
    videoCheckInterval = null;
  }
}

// Pause the video (called when out of credits)
function pauseVideo() {
  if (videoElement) {
    videoElement.pause();
  }
  showBlockingOverlay();
}

// Show blocking overlay when out of credits
function showBlockingOverlay() {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById("earny-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  isBlocked = true;

  const overlay = document.createElement("div");
  overlay.id = "earny-overlay";
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
      <h1 style="font-size: 32px; margin: 0 0 16px 0;">Out of Credits!</h1>
      <p style="font-size: 18px; color: #aaa; margin: 0 0 24px 0; text-align: center; max-width: 400px;">
        You've run out of Earny credits. Log some fitness activities to earn more!
      </p>
      <button id="earny-dashboard" style="
        background: #6366f1;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        font-weight: 500;
      ">
        Go to Dashboard
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("earny-dashboard").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openDashboard" });
  });
}

// Remove blocking overlay
function removeBlockingOverlay() {
  const existingOverlay = document.getElementById("earny-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }
  isBlocked = false;
}

// Check balance and block if needed
async function checkBalanceAndBlock() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getBalance" }, (response) => {
      if (response && response.balance !== undefined && response.balance <= 0) {
        showBlockingOverlay();
        resolve(true);
      } else {
        removeBlockingOverlay();
        resolve(false);
      }
    });
  });
}

// Watch for video element changes (SPAs like YouTube)
function setupObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(() => {
    const video = findVideo();
    if (video && !videoCheckInterval) {
      startVideoPolling();
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
async function init() {
  const platform = getPlatform();
  if (!platform) return;

  // Reset state on init
  lastPlayingState = null;
  stopVideoPolling();

  // Check balance immediately on page load - block if no credits
  const blocked = await checkBalanceAndBlock();
  if (blocked) return;

  // Start polling for video state
  startVideoPolling();

  // Set up observer for dynamic content (in case video loads later)
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
