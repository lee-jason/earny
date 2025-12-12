// Earny Background Script (Firefox)
// Handles balance tracking and video time deductions

// CONFIG is loaded from config.js via manifest
const API_BASE = CONFIG.API_BASE;

// State
let isTracking = false;
let currentTab = null;
let trackingStartTime = null;
let accumulatedMinutes = 0;

// Get session cookie from the API domain
async function getSessionCookie() {
  try {
    const url = new URL(API_BASE);

    // Try multiple approaches to get cookies
    let cookies = [];

    // Approach 1: By URL
    try {
      cookies = await browser.cookies.getAll({ url: API_BASE });
      console.log("Cookies by URL:", cookies);
    } catch (e) {
      console.log("URL approach failed:", e);
    }

    // Approach 2: By domain with firstPartyDomain
    if (cookies.length === 0) {
      try {
        cookies = await browser.cookies.getAll({
          domain: url.hostname,
          firstPartyDomain: null
        });
        console.log("Cookies by domain with firstPartyDomain:", cookies);
      } catch (e) {
        console.log("Domain approach failed:", e);
      }
    }

    // Approach 3: Get all cookies and filter
    if (cookies.length === 0) {
      try {
        const allCookies = await browser.cookies.getAll({});
        cookies = allCookies.filter(c =>
          c.domain === url.hostname ||
          c.domain === "localhost" ||
          c.domain === ".localhost"
        );
        console.log("Filtered from all cookies:", cookies);
      } catch (e) {
        console.log("All cookies approach failed:", e);
      }
    }

    console.log("Final cookies:", cookies);
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
  browser.alarms.create("earny-minute-check", { periodInMinutes: 1 });
}

// Stop tracking and spend credits
async function stopTracking() {
  if (!isTracking) return;

  browser.alarms.clear("earny-minute-check");

  const elapsedMs = Date.now() - trackingStartTime;
  const totalMinutes = Math.floor(elapsedMs / 60000) + accumulatedMinutes;

  if (totalMinutes > 0 && currentTab) {
    // Get tab info for video details
    try {
      const tab = await browser.tabs.get(currentTab);
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
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "earny-minute-check" && isTracking) {
    accumulatedMinutes++;

    // Check balance
    const balanceData = await fetchBalance();
    if (balanceData.balance !== undefined && balanceData.balance <= 0) {
      // Out of credits - notify content script to pause video
      if (currentTab) {
        browser.tabs.sendMessage(currentTab, { action: "pauseVideo" });
      }
      await stopTracking();
    }
  }
});

// Handle messages from content script and popup
browser.runtime.onMessage.addListener((message, sender) => {
  return (async () => {
    switch (message.action) {
      case "getBalance":
        return await fetchBalance();

      case "videoPlaying":
        if (sender.tab) {
          startTracking(sender.tab.id);
        }
        return { tracking: true };

      case "videoPaused":
      case "videoEnded":
        await stopTracking();
        return { tracking: false };

      case "getTrackingStatus":
        return {
          isTracking,
          currentTab,
          accumulatedMinutes:
            accumulatedMinutes +
            (trackingStartTime
              ? Math.floor((Date.now() - trackingStartTime) / 60000)
              : 0),
        };

      case "openLogin":
        browser.tabs.create({ url: `${API_BASE}/login` });
        return { success: true };

      case "openDashboard":
        browser.tabs.create({ url: `${API_BASE}/dashboard` });
        return { success: true };

      default:
        return { error: "Unknown action" };
    }
  })();
});

// Handle tab close
browser.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTab) {
    stopTracking();
  }
});

// Handle tab navigation
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTab && changeInfo.url) {
    const platform = detectPlatform(changeInfo.url);
    if (!platform) {
      stopTracking();
    }
  }
});
