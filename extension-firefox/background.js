// Earny Background Script (Firefox)
// Handles balance tracking and video time deductions

// CONFIG is loaded via manifest.json before this script
const API_BASE = CONFIG.API_BASE;

// State
let isTracking = false;
let currentTab = null;
let trackingStartTime = null;
let accumulatedMinutes = 0;

// Get session cookie from the API domain
async function getSessionCookie() {
  try {
    const cookies = await browser.cookies.getAll({ url: API_BASE });
    const sessionCookie = cookies?.find(c => c.name === "authjs.session-token");
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
  browser.alarms.create("earny-minute-check", { periodInMinutes: 1 });
}

// Stop tracking (credits are already spent every minute via alarm)
async function stopTracking() {
  if (!isTracking) return;

  browser.alarms.clear("earny-minute-check");

  isTracking = false;
  currentTab = null;
  trackingStartTime = null;
  accumulatedMinutes = 0;
}

// Handle alarm (minute check)
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "earny-minute-check" && isTracking && currentTab) {
    // Spend 1 credit for this minute
    browser.tabs.get(currentTab).then(async (tab) => {
      if (!tab || !tab.url) {
        await stopTracking();
        return;
      }

      const platform = detectPlatform(tab.url);

      if (platform) {
        const result = await spendCredits(platform, 1, tab.url, tab.title);

        // Only stop if insufficient balance (402 error)
        if (result.error === "Insufficient balance" ||
            (result.newBalance !== undefined && result.newBalance <= 0)) {
          browser.tabs.sendMessage(currentTab, { action: "pauseVideo" });
          await stopTracking();
        }
        // For other errors (network, auth), keep tracking - will retry next minute
      }
    }).catch(async () => {
      // Tab might be closed
      await stopTracking();
    });
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
