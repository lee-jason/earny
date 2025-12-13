// Earny Background Service Worker
// Handles balance tracking and video time deductions with session-based commits

// Import config
importScripts("config.js");

const API_BASE = CONFIG.API_BASE;

// Session state (tracked in memory and persisted to storage)
let activeSession = null; // { platform, videoUrl, videoTitle, startTime, minutes }

// Initialize: check for uncommitted session from previous run
chrome.runtime.onStartup.addListener(recoverUncommittedSession);
chrome.runtime.onInstalled.addListener(recoverUncommittedSession);

// Also recover on service worker wake-up
recoverUncommittedSession();

// Recover and commit any uncommitted session from storage
async function recoverUncommittedSession() {
  try {
    const data = await chrome.storage.local.get("earnyUncommittedSession");
    const session = data.earnyUncommittedSession;

    if (session && session.minutes > 0) {
      console.log("[Earny] Recovering uncommitted session:", session);

      // Commit the orphaned session
      const result = await spendCredits(
        session.platform,
        session.minutes,
        session.videoUrl,
        session.videoTitle
      );

      if (result.error) {
        console.error("[Earny] Failed to commit recovered session:", result.error);
        // Keep it in storage to retry later if it's a network error
        if (result.error !== "Insufficient balance" && result.error !== "Unauthorized") {
          return;
        }
      } else {
        console.log("[Earny] Successfully committed recovered session:", result);
      }

      // Clear the uncommitted session
      await chrome.storage.local.remove("earnyUncommittedSession");
    }
  } catch (error) {
    console.error("[Earny] Error recovering session:", error);
  }
}

// Save current session to storage (for crash recovery)
async function persistSession() {
  if (activeSession && activeSession.minutes > 0) {
    await chrome.storage.local.set({ earnyUncommittedSession: activeSession });
  } else {
    await chrome.storage.local.remove("earnyUncommittedSession");
  }
}

// Get session cookie from the API domain
async function getSessionCookie() {
  try {
    const cookies = await chrome.cookies.getAll({ url: API_BASE });
    const sessionCookie = cookies.find((c) => c.name === "authjs.session-token");
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

// Start a new tracking session
async function startSession(tabId) {
  if (activeSession) {
    console.log("[Earny] Session already active, ignoring start");
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    const platform = detectPlatform(tab.url);

    if (!platform) {
      console.log("[Earny] Not a supported platform");
      return;
    }

    activeSession = {
      tabId,
      platform,
      videoUrl: tab.url,
      videoTitle: tab.title,
      startTime: Date.now(),
      minutes: 0,
    };

    console.log("[Earny] Started session:", activeSession);

    // Set up periodic minute check
    chrome.alarms.create("earny-minute-check", { periodInMinutes: 1 });

    await persistSession();
  } catch (error) {
    console.error("[Earny] Error starting session:", error);
  }
}

// End current session and commit credits
async function endSession(reason = "ended") {
  if (!activeSession) {
    console.log("[Earny] No active session to end");
    return;
  }

  const session = activeSession;
  activeSession = null;
  chrome.alarms.clear("earny-minute-check");

  // Only commit if we have minutes to charge
  if (session.minutes > 0) {
    console.log(`[Earny] Committing session (${reason}):`, session.minutes, "minutes");

    const result = await spendCredits(
      session.platform,
      session.minutes,
      session.videoUrl,
      session.videoTitle
    );

    if (result.error) {
      console.error("[Earny] Failed to commit session:", result.error);
      // If it's a network error, save for recovery
      if (result.error !== "Insufficient balance" && result.error !== "Unauthorized") {
        await chrome.storage.local.set({ earnyUncommittedSession: session });
        return;
      }
    } else {
      console.log("[Earny] Session committed successfully:", result);
    }
  } else {
    console.log("[Earny] Session had 0 minutes, nothing to commit");
  }

  await chrome.storage.local.remove("earnyUncommittedSession");
}

// Handle alarm (minute check)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "earny-minute-check" || !activeSession) {
    return;
  }

  // Increment session minutes
  activeSession.minutes += 1;
  console.log("[Earny] Minute tick, session minutes:", activeSession.minutes);

  // Persist updated session
  await persistSession();

  // Check if user can afford to continue
  const balanceResult = await fetchBalance();

  if (balanceResult.error) {
    console.log("[Earny] Balance check failed:", balanceResult.error);
    // On network/auth errors, keep tracking - will check again next minute
    return;
  }

  const projectedCost = activeSession.minutes; // 1 credit per minute
  const availableBalance = balanceResult.balance;

  console.log("[Earny] Balance check - available:", availableBalance, "session cost:", projectedCost);

  // If balance would go to 0 or below after committing this session, stop and commit immediately
  if (availableBalance <= projectedCost) {
    console.log("[Earny] Balance exhausted, committing session and blocking");

    // Pause the video
    try {
      chrome.tabs.sendMessage(activeSession.tabId, { action: "pauseVideo" });
    } catch (e) {
      console.error("[Earny] Failed to pause video:", e);
    }

    // Commit immediately
    await endSession("balance_exhausted");
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
          await startSession(sender.tab.id);
        }
        sendResponse({ tracking: true });
        break;

      case "videoPaused":
      case "videoEnded":
        // Only end if the message is from the tab we're tracking
        if (sender.tab && activeSession && sender.tab.id === activeSession.tabId) {
          await endSession(message.action);
        }
        sendResponse({ tracking: false });
        break;

      case "getTrackingStatus":
        let tabTitle = null;
        if (activeSession) {
          try {
            const tab = await chrome.tabs.get(activeSession.tabId);
            tabTitle = tab?.title || null;
          } catch (e) {
            // Tab might be closed
          }
        }
        sendResponse({
          isTracking: !!activeSession,
          currentTab: activeSession?.tabId || null,
          tabTitle,
          accumulatedMinutes: activeSession?.minutes || 0,
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
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeSession && tabId === activeSession.tabId) {
    console.log("[Earny] Tracked tab closed");
    await endSession("tab_closed");
  }
});

// Handle tab navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (activeSession && tabId === activeSession.tabId && changeInfo.url) {
    const platform = detectPlatform(changeInfo.url);
    if (!platform) {
      console.log("[Earny] Tab navigated away from video platform");
      await endSession("navigated_away");
    }
  }
});
