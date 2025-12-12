// Earny Background Service Worker
// Handles balance tracking and video time deductions

// Import config
importScripts("config.js");

const API_BASE = CONFIG.API_BASE;

// State
let isTracking = false;
let currentTab = null;
let trackingStartTime = null;
let accumulatedMinutes = 0;

// Get session cookie from the API domain
async function getSessionCookie() {
  try {
    // Try with URL first (works better for localhost)
    const cookies = await chrome.cookies.getAll({ url: API_BASE });
    console.log("All cookies for", API_BASE, ":", cookies);
    const sessionCookie = cookies.find(c => c.name === "authjs.session-token");
    return sessionCookie?.value;
  } catch (error) {
    console.error("Error getting cookies:", error);
    return null;
  }
}

// Fetch current balance from API
async function fetchBalance() {
  try {
    const sessionToken = await getSessionCookie();
    console.log("Session token:", sessionToken ? "found" : "not found");

    const headers = {};
    if (sessionToken) {
      headers["Cookie"] = `authjs.session-token=${sessionToken}`;
    }

    const response = await fetch(`${API_BASE}/api/balance`, {
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: "Not logged in" };
      }
      return { error: "Failed to fetch balance" };
    }

    return await response.json();
  } catch (error) {
    console.error("fetchBalance error:", error);
    return { error: "Network error" };
  }
}

// Spend credits via API
async function spendCredits(platform, durationMinutes, videoUrl, videoTitle) {
  try {
    const sessionToken = await getSessionCookie();

    const headers = {
      "Content-Type": "application/json",
    };
    if (sessionToken) {
      headers["Cookie"] = `authjs.session-token=${sessionToken}`;
    }

    const response = await fetch(`${API_BASE}/api/spend`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        platform,
        durationMinutes,
        videoUrl,
        videoTitle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Failed to spend credits" };
    }

    return data;
  } catch (error) {
    return { error: "Network error" };
  }
}

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes("youtube.com")) return "youtube";
  if (url.includes("twitch.tv")) return "twitch";
  return null;
}

// Start tracking video time
function startTracking(tabId) {
  if (isTracking) return;

  isTracking = true;
  currentTab = tabId;
  trackingStartTime = Date.now();
  accumulatedMinutes = 0;

  // Set up periodic check every minute
  chrome.alarms.create("earny-minute-check", { periodInMinutes: 1 });
}

// Stop tracking (credits are already spent every minute via alarm)
async function stopTracking() {
  if (!isTracking) return;

  chrome.alarms.clear("earny-minute-check");

  isTracking = false;
  currentTab = null;
  trackingStartTime = null;
  accumulatedMinutes = 0;
}

// Handle alarm (minute check)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "earny-minute-check" && isTracking && currentTab) {
    // Spend 1 credit for this minute
    try {
      const tab = await chrome.tabs.get(currentTab);
      const platform = detectPlatform(tab.url);

      if (platform) {
        const result = await spendCredits(platform, 1, tab.url, tab.title);

        // Only stop if insufficient balance (402 error)
        if (result.error === "Insufficient balance" ||
            (result.newBalance !== undefined && result.newBalance <= 0)) {
          chrome.tabs.sendMessage(currentTab, { action: "pauseVideo" });
          await stopTracking();
        }
        // For other errors (network, auth), keep tracking - will retry next minute
      }
    } catch (e) {
      // Tab might be closed
      await stopTracking();
    }
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case "getBalance":
        const balance = await fetchBalance();
        sendResponse(balance);
        break;

      case "videoPlaying":
        if (sender.tab) {
          startTracking(sender.tab.id);
        }
        sendResponse({ tracking: true });
        break;

      case "videoPaused":
      case "videoEnded":
        await stopTracking();
        sendResponse({ tracking: false });
        break;

      case "getTrackingStatus":
        sendResponse({
          isTracking,
          currentTab,
          accumulatedMinutes:
            accumulatedMinutes +
            (trackingStartTime
              ? Math.floor((Date.now() - trackingStartTime) / 60000)
              : 0),
        });
        break;

      case "openLogin":
        chrome.tabs.create({ url: `${API_BASE}/login` });
        sendResponse({ success: true });
        break;

      case "openDashboard":
        chrome.tabs.create({ url: `${API_BASE}/dashboard` });
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: "Unknown action" });
    }
  })();

  return true; // Keep channel open for async response
});

// Handle tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTab) {
    stopTracking();
  }
});

// Handle tab navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTab && changeInfo.url) {
    const platform = detectPlatform(changeInfo.url);
    if (!platform) {
      stopTracking();
    }
  }
});
