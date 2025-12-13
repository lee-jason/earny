// Earny Background Script (Firefox)
// Handles balance tracking and video time deductions

// CONFIG is loaded via manifest.json before this script
const API_BASE = CONFIG.API_BASE;

// State (will be restored from storage on wake)
// Track multiple tabs: Set of tab IDs that are currently playing video
let playingTabs = new Set();
let trackingStartTime = null;
let accumulatedMinutes = 0;

// Persist state to storage (survives background script unload)
async function saveState() {
  await browser.storage.local.set({
    earnyState: {
      playingTabs: Array.from(playingTabs),
      trackingStartTime,
      accumulatedMinutes
    }
  });
}

// Restore state from storage
async function restoreState() {
  const data = await browser.storage.local.get("earnyState");
  if (data.earnyState) {
    playingTabs = new Set(data.earnyState.playingTabs || []);
    trackingStartTime = data.earnyState.trackingStartTime || null;
    accumulatedMinutes = data.earnyState.accumulatedMinutes || 0;
    console.log("[Earny BG] Restored state - playingTabs:", Array.from(playingTabs));
  } else {
    console.log("[Earny BG] No saved state found");
  }
}

// Check if any tabs are currently playing
function isTracking() {
  return playingTabs.size > 0;
}

// Restore state on script load
console.log("[Earny BG] Background script loaded");
restoreState().then(() => {
  // Check if we should have an alarm running
  if (isTracking()) {
    console.log("[Earny BG] Was tracking, checking alarm status");
    browser.alarms.get("earny-minute-check").then((alarm) => {
      if (!alarm) {
        console.log("[Earny BG] Alarm missing, recreating");
        browser.alarms.create("earny-minute-check", { periodInMinutes: 1 });
      } else {
        console.log("[Earny BG] Alarm exists:", alarm);
      }
    });
  }
});

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

// Add a tab to tracking
function addPlayingTab(tabId) {
  const wasTracking = isTracking();
  playingTabs.add(tabId);
  console.log("[Earny BG] Added tab", tabId, "to playing tabs. Total:", playingTabs.size);

  // Start alarm if this is the first playing tab
  if (!wasTracking && isTracking()) {
    trackingStartTime = Date.now();
    accumulatedMinutes = 0;
    browser.alarms.create("earny-minute-check", { periodInMinutes: 1 });
    console.log("[Earny BG] Started tracking, alarm created");

    // Verify alarm was created
    browser.alarms.get("earny-minute-check").then((alarm) => {
      console.log("[Earny BG] Alarm verification:", alarm);
    });
  }

  saveState();
}

// Remove a tab from tracking
async function removePlayingTab(tabId) {
  if (!playingTabs.has(tabId)) {
    console.log("[Earny BG] Tab", tabId, "not in playing tabs, ignoring");
    return;
  }

  playingTabs.delete(tabId);
  console.log("[Earny BG] Removed tab", tabId, "from playing tabs. Remaining:", playingTabs.size);

  // Stop alarm if no more playing tabs
  if (!isTracking()) {
    console.log("[Earny BG] No more playing tabs, stopping tracking");
    browser.alarms.clear("earny-minute-check");
    trackingStartTime = null;
    accumulatedMinutes = 0;
  }

  saveState();
}

// Stop all tracking
async function stopAllTracking() {
  console.log("[Earny BG] Stopping all tracking");
  playingTabs.clear();
  browser.alarms.clear("earny-minute-check");
  trackingStartTime = null;
  accumulatedMinutes = 0;
  saveState();
}

// Handle alarm (minute check)
browser.alarms.onAlarm.addListener(async (alarm) => {
  console.log("[Earny BG] Alarm fired:", alarm.name, "playingTabs:", Array.from(playingTabs));

  if (alarm.name === "earny-minute-check" && isTracking()) {
    // Get first valid playing tab to determine platform for spending
    let spendTab = null;
    for (const tabId of playingTabs) {
      try {
        const tab = await browser.tabs.get(tabId);
        if (tab && tab.url && detectPlatform(tab.url)) {
          spendTab = tab;
          break;
        }
      } catch (e) {
        // Tab might be closed, remove it
        playingTabs.delete(tabId);
      }
    }

    if (!spendTab) {
      console.log("[Earny BG] No valid playing tabs found, stopping");
      await stopAllTracking();
      return;
    }

    const platform = detectPlatform(spendTab.url);
    console.log("[Earny BG] Spending 1 credit for platform:", platform);

    const result = await spendCredits(platform, 1, spendTab.url, spendTab.title);
    console.log("[Earny BG] Spend result:", result);

    // Only stop if insufficient balance (402 error)
    if (result.error === "Insufficient balance" ||
        (result.newBalance !== undefined && result.newBalance <= 0)) {
      console.log("[Earny BG] Insufficient balance, pausing all videos");
      // Pause all playing tabs
      for (const tabId of playingTabs) {
        try {
          browser.tabs.sendMessage(tabId, { action: "pauseVideo" });
        } catch (e) {
          // Tab might be closed
        }
      }
      await stopAllTracking();
    }
    // For other errors (network, auth), keep tracking - will retry next minute

    saveState();
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Earny BG] Received message:", message.action, "from tab:", sender.tab?.id);

  (async () => {
    switch (message.action) {
      case "getBalance":
        const balance = await fetchBalance();
        sendResponse(balance);
        break;

      case "videoPlaying":
        if (sender.tab) {
          addPlayingTab(sender.tab.id);
        }
        sendResponse({ tracking: true });
        break;

      case "videoPaused":
      case "videoEnded":
        if (sender.tab) {
          await removePlayingTab(sender.tab.id);
        }
        sendResponse({ tracking: !isTracking() });
        break;

      case "getTrackingStatus":
        // Get titles of all playing tabs
        let tabTitles = [];
        for (const tabId of playingTabs) {
          try {
            const tab = await browser.tabs.get(tabId);
            if (tab?.title) {
              tabTitles.push(tab.title);
            }
          } catch (e) {
            // Tab might be closed
          }
        }
        sendResponse({
          isTracking: isTracking(),
          playingTabs: Array.from(playingTabs),
          tabTitles,
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
  if (playingTabs.has(tabId)) {
    console.log("[Earny BG] Playing tab closed:", tabId);
    removePlayingTab(tabId);
  }
});

// Handle tab navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (playingTabs.has(tabId) && changeInfo.url) {
    const platform = detectPlatform(changeInfo.url);
    if (!platform) {
      console.log("[Earny BG] Tab", tabId, "navigated away from video platform");
      removePlayingTab(tabId);
    }
  }
});
