// Earny Background Service Worker
// Handles balance tracking and video time deductions

const API_BASE = ""; // Set this to your deployed Vercel URL

// State
let isTracking = false;
let currentTab = null;
let trackingStartTime = null;
let accumulatedMinutes = 0;

// Get stored settings
async function getSettings() {
  const result = await chrome.storage.local.get(["apiBase", "authToken"]);
  return {
    apiBase: result.apiBase || API_BASE,
    authToken: result.authToken || null,
  };
}

// Fetch current balance from API
async function fetchBalance() {
  const settings = await getSettings();
  if (!settings.apiBase) {
    return { error: "API not configured" };
  }

  try {
    const response = await fetch(`${settings.apiBase}/api/balance`, {
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
    return { error: "Network error" };
  }
}

// Spend credits via API
async function spendCredits(platform, durationMinutes, videoUrl, videoTitle) {
  const settings = await getSettings();
  if (!settings.apiBase) {
    return { error: "API not configured" };
  }

  try {
    const response = await fetch(`${settings.apiBase}/api/spend`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
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

// Stop tracking and spend credits
async function stopTracking() {
  if (!isTracking) return;

  chrome.alarms.clear("earny-minute-check");

  const elapsedMs = Date.now() - trackingStartTime;
  const totalMinutes = Math.floor(elapsedMs / 60000) + accumulatedMinutes;

  if (totalMinutes > 0 && currentTab) {
    // Get tab info for video details
    try {
      const tab = await chrome.tabs.get(currentTab);
      const platform = detectPlatform(tab.url);

      if (platform) {
        await spendCredits(platform, totalMinutes, tab.url, tab.title);
      }
    } catch (e) {
      // Tab might be closed
    }
  }

  isTracking = false;
  currentTab = null;
  trackingStartTime = null;
  accumulatedMinutes = 0;
}

// Handle alarm (minute check)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "earny-minute-check" && isTracking) {
    accumulatedMinutes++;

    // Check balance
    const balanceData = await fetchBalance();
    if (balanceData.balance !== undefined && balanceData.balance <= 0) {
      // Out of credits - notify content script to pause video
      if (currentTab) {
        chrome.tabs.sendMessage(currentTab, { action: "pauseVideo" });
      }
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

      case "setApiBase":
        await chrome.storage.local.set({ apiBase: message.apiBase });
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
