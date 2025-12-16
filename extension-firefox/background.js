// Earny Background Script (Firefox)
// Handles balance tracking and video time deductions with session-based commits

// CONFIG is loaded via manifest.json before this script
const API_BASE = CONFIG.API_BASE;

// Log when background script loads (helps detect restarts after suspension)
console.log("[Earny] Background script loaded at", new Date().toISOString());

// Session state (tracked in memory and persisted to storage)
// playingTabs: Set of tab IDs currently playing video
// session: { startTime, minutes, tabs: { tabId: { platform, videoUrl, videoTitle } } }
let playingTabs = new Set();
let session = null;
let recoveryInProgress = false;
let waivedMode = false;

// Load waived mode from storage on startup
browser.storage.local.get("earnyWaivedMode").then((data) => {
  waivedMode = data.earnyWaivedMode || false;
  console.log("[Earny] Loaded waived mode:", waivedMode);
});

// Initialize: check for uncommitted session from previous run
// Only use direct call - onStartup/onInstalled can cause duplicate runs
recoverUncommittedSession();

// Recover and commit any uncommitted session from storage
async function recoverUncommittedSession() {
  // Prevent concurrent recovery attempts
  if (recoveryInProgress) {
    console.log("[Earny] Recovery already in progress, skipping");
    return;
  }
  recoveryInProgress = true;

  try {
    const data = await browser.storage.local.get("earnyUncommittedSession");
    const savedSession = data.earnyUncommittedSession;

    if (savedSession && savedSession.minutes > 0) {
      console.log("[Earny] Recovering uncommitted session:", savedSession);

      // Clear storage first to prevent duplicate commits
      await browser.storage.local.remove("earnyUncommittedSession");

      // Commit the orphaned session
      const result = await spendCredits(
        savedSession.platform,
        savedSession.minutes,
        savedSession.videoUrl,
        savedSession.videoTitle,
        savedSession.waived || false
      );

      if (result.error) {
        console.error("[Earny] Failed to commit recovered session:", result.error);
        // If it's a network error, save it back for retry later
        if (result.error !== "Insufficient balance" && result.error !== "Unauthorized") {
          await browser.storage.local.set({ earnyUncommittedSession: savedSession });
        }
      } else {
        console.log("[Earny] Successfully committed recovered session:", result);
      }
    }
  } catch (error) {
    console.error("[Earny] Error recovering session:", error);
  } finally {
    recoveryInProgress = false;
  }
}

// Save current session to storage (for crash recovery)
async function persistSession() {
  if (session && session.minutes > 0) {
    // Get first tab's info for the commit (we'll use combined title for description)
    const tabIds = Object.keys(session.tabs);
    const firstTab = tabIds.length > 0 ? session.tabs[tabIds[0]] : null;

    // Build combined title from all tabs
    const titles = Object.values(session.tabs).map(t => t.videoTitle).filter(Boolean);
    const combinedTitle = titles.join(" | ");

    await browser.storage.local.set({
      earnyUncommittedSession: {
        platform: firstTab?.platform || "youtube",
        videoUrl: firstTab?.videoUrl || "",
        videoTitle: combinedTitle,
        startTime: session.startTime,
        minutes: session.minutes,
        waived: waivedMode,
      }
    });
  } else {
    await browser.storage.local.remove("earnyUncommittedSession");
  }
}

// Get session cookie from the API domain
async function getSessionCookie() {
  try {
    const cookies = await browser.cookies.getAll({ url: API_BASE });
    const sessionCookie = cookies?.find((c) => c.name === "authjs.session-token");
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
async function spendCredits(platform, durationMinutes, videoUrl, videoTitle, waived = false) {
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
        waived,
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

// Check if any tabs are playing
function isTracking() {
  return playingTabs.size > 0;
}

// Update the extension badge to show number of playing tabs
function updateBadge() {
  const count = playingTabs.size;
  if (count > 0) {
    browser.browserAction.setBadgeText({ text: String(count) });
    browser.browserAction.setBadgeBackgroundColor({ color: "#6366f1" });
  } else {
    browser.browserAction.setBadgeText({ text: "" });
  }
}

// Add a tab to tracking
async function addPlayingTab(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    const platform = detectPlatform(tab.url);

    if (!platform) {
      console.log("[Earny] Not a supported platform");
      return;
    }

    const wasTracking = isTracking();
    playingTabs.add(tabId);
    updateBadge();

    // Initialize or update session
    if (!session) {
      session = {
        startTime: Date.now(),
        minutes: 0,
        tabs: {},
      };
    }

    // Store tab info
    session.tabs[tabId] = {
      platform,
      videoUrl: tab.url,
      videoTitle: tab.title,
    };

    console.log("[Earny] Added tab", tabId, "- Total playing:", playingTabs.size);

    // Start alarm if this is the first playing tab
    if (!wasTracking) {
      browser.alarms.create("earny-minute-check", { periodInMinutes: 1 });
      console.log("[Earny] Started tracking, alarm created");
    }

    await persistSession();
  } catch (error) {
    console.error("[Earny] Error adding tab:", error);
  }
}

// Remove a tab from tracking
async function removePlayingTab(tabId) {
  if (!playingTabs.has(tabId)) {
    return;
  }

  playingTabs.delete(tabId);
  updateBadge();

  console.log("[Earny] Removed tab", tabId, "- Remaining:", playingTabs.size);

  // If no more playing tabs, end the session (keep tab info for commit)
  if (!isTracking()) {
    await endSession("all_videos_stopped");
  } else {
    // Only delete tab info if session continues (other tabs still playing)
    if (session && session.tabs[tabId]) {
      delete session.tabs[tabId];
    }
    await persistSession();
  }
}

// End current session and commit credits
async function endSession(reason = "ended") {
  if (!session) {
    console.log("[Earny] No active session to end");
    return;
  }

  const sessionToCommit = session;
  session = null;
  playingTabs.clear();
  updateBadge();
  browser.alarms.clear("earny-minute-check");

  // Only commit if we have minutes to charge
  if (sessionToCommit.minutes > 0) {
    // Get first tab's info for platform, combine titles
    const tabInfos = Object.values(sessionToCommit.tabs);
    const firstTab = tabInfos[0] || { platform: "youtube", videoUrl: "" };
    const titles = tabInfos.map(t => t.videoTitle).filter(Boolean);
    const combinedTitle = titles.join(" | ");

    console.log(`[Earny] Committing session (${reason}):`, sessionToCommit.minutes, "minutes, waived:", waivedMode);

    const result = await spendCredits(
      firstTab.platform,
      sessionToCommit.minutes,
      firstTab.videoUrl,
      combinedTitle,
      waivedMode
    );

    if (result.error) {
      console.error("[Earny] Failed to commit session:", result.error);
      // If it's a network error, save for recovery
      if (result.error !== "Insufficient balance" && result.error !== "Unauthorized") {
        await browser.storage.local.set({
          earnyUncommittedSession: {
            platform: firstTab.platform,
            videoUrl: firstTab.videoUrl,
            videoTitle: combinedTitle,
            startTime: sessionToCommit.startTime,
            minutes: sessionToCommit.minutes,
            waived: waivedMode,
          }
        });
        return;
      }
    } else {
      console.log("[Earny] Session committed successfully:", result);
    }
  } else {
    console.log("[Earny] Session had 0 minutes, nothing to commit");
  }

  await browser.storage.local.remove("earnyUncommittedSession");
}

// Handle alarm (minute check)
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "earny-minute-check" || !isTracking() || !session) {
    return;
  }

  // Increment session minutes
  session.minutes += 1;
  console.log("[Earny] Minute tick, session minutes:", session.minutes);

  // Update tab titles (they may have changed)
  for (const tabId of playingTabs) {
    try {
      const tab = await browser.tabs.get(tabId);
      if (session.tabs[tabId]) {
        session.tabs[tabId].videoTitle = tab.title;
        session.tabs[tabId].videoUrl = tab.url;
      }
    } catch (e) {
      // Tab might be closed, remove it
      playingTabs.delete(tabId);
      if (session.tabs[tabId]) {
        delete session.tabs[tabId];
      }
    }
  }

  // Persist updated session
  await persistSession();

  // Skip balance check in waived mode
  if (waivedMode) {
    console.log("[Earny] Waived mode - skipping balance check");
    return;
  }

  // Check if user can afford to continue
  const balanceResult = await fetchBalance();

  if (balanceResult.error) {
    console.log("[Earny] Balance check failed:", balanceResult.error);
    // On network/auth errors, keep tracking - will check again next minute
    return;
  }

  const projectedCost = session.minutes; // 1 credit per minute
  const availableBalance = balanceResult.balance;

  console.log("[Earny] Balance check - available:", availableBalance, "session cost:", projectedCost);

  // If balance would go to 0 or below after committing this session, stop and commit immediately
  if (availableBalance <= projectedCost) {
    console.log("[Earny] Balance exhausted, committing session and blocking");

    // Pause all playing videos
    for (const tabId of playingTabs) {
      try {
        browser.tabs.sendMessage(tabId, { action: "pauseVideo" });
      } catch (e) {
        console.error("[Earny] Failed to pause video in tab", tabId, e);
      }
    }

    // Commit immediately
    await endSession("balance_exhausted");
  }
});

// Handle messages from content script and popup
// Use chrome.runtime for compatibility (Firefox supports both)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case "getBalance":
        const balance = await fetchBalance();
        sendResponse(balance);
        break;

      case "videoPlaying":
        if (sender.tab) {
          await addPlayingTab(sender.tab.id);
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
        const tabTitles = [];
        if (session) {
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
        }
        sendResponse({
          isTracking: isTracking(),
          playingTabs: Array.from(playingTabs),
          tabTitles,
          accumulatedMinutes: session?.minutes || 0,
        });
        break;

      case "openLogin":
        browser.tabs.create({ url: `${API_BASE}/login` });
        sendResponse({ success: true });
        break;

      case "openDashboard":
        browser.tabs.create({ url: `${API_BASE}/dashboard` });
        sendResponse({ success: true });
        break;

      case "getWaivedMode":
        sendResponse({ waived: waivedMode });
        break;

      case "setWaivedMode":
        waivedMode = message.waived === true;
        browser.storage.local.set({ earnyWaivedMode: waivedMode });
        console.log("[Earny] Waived mode set to:", waivedMode);
        sendResponse({ success: true, waived: waivedMode });
        break;

      default:
        sendResponse({ error: "Unknown action" });
    }
  })();

  return true; // Keep channel open for async response
});

// Handle tab close
browser.tabs.onRemoved.addListener(async (tabId) => {
  if (playingTabs.has(tabId)) {
    console.log("[Earny] Playing tab closed:", tabId);
    await removePlayingTab(tabId);
  }
});

// Handle tab navigation
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (playingTabs.has(tabId) && changeInfo.url) {
    const platform = detectPlatform(changeInfo.url);
    if (!platform) {
      console.log("[Earny] Tab", tabId, "navigated away from video platform");
      await removePlayingTab(tabId);
    }
  }
});
