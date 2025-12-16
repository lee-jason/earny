// Earny Popup Script (Chrome)

const elements = {
  loading: document.getElementById("loading"),
  notLoggedIn: document.getElementById("not-logged-in"),
  mainContent: document.getElementById("main-content"),
  balance: document.getElementById("balance"),
  trackingStatus: document.getElementById("tracking-status"),
  trackingMinutes: document.getElementById("tracking-minutes"),
  trackingTitle: document.getElementById("tracking-title"),
  waivedCheckbox: document.getElementById("waived-checkbox"),
  loginBtn: document.getElementById("login-btn"),
  dashboardBtn: document.getElementById("dashboard-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
};

// Show a section and hide others
function showSection(section) {
  elements.loading.classList.add("hidden");
  elements.notLoggedIn.classList.add("hidden");
  elements.mainContent.classList.add("hidden");

  section.classList.remove("hidden");
}

// Fetch balance from background script
async function fetchBalance() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getBalance" }, resolve);
  });
}

// Get tracking status from background script
async function getTrackingStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getTrackingStatus" }, resolve);
  });
}

// Get waived mode from background script
async function getWaivedMode() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getWaivedMode" }, resolve);
  });
}

// Set waived mode in background script
async function setWaivedMode(waived) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "setWaivedMode", waived }, resolve);
  });
}

// Update tracking display
async function updateTrackingDisplay() {
  const status = await getTrackingStatus();

  if (status.isTracking) {
    elements.trackingStatus.classList.remove("hidden");
    elements.trackingMinutes.textContent = status.accumulatedMinutes;

    if (status.tabTitles && status.tabTitles.length > 0) {
      // Show all playing tab titles, each on its own line, truncated
      const titles = status.tabTitles.map(t =>
        t.length > 40 ? t.substring(0, 40) + "..." : t
      );
      elements.trackingTitle.textContent = titles.join("\n");
    } else {
      elements.trackingTitle.textContent = "";
    }
  } else {
    elements.trackingStatus.classList.add("hidden");
  }
}

// Update balance display accounting for uncommitted session
async function updateBalanceDisplay() {
  const balanceData = await fetchBalance();

  if (balanceData.error === "Not logged in") {
    showSection(elements.notLoggedIn);
    return;
  }

  if (balanceData.error) {
    elements.balance.textContent = "Error";
    return;
  }

  const status = await getTrackingStatus();
  const waivedData = await getWaivedMode();

  // Subtract accumulated minutes if tracking and not in waived mode
  let displayBalance = balanceData.balance;
  if (status.isTracking && status.accumulatedMinutes > 0 && !waivedData.waived) {
    displayBalance = Math.max(0, balanceData.balance - status.accumulatedMinutes);
  }

  elements.balance.textContent = displayBalance.toLocaleString();
}

// Initialize popup
async function init() {
  showSection(elements.loading);

  const balanceData = await fetchBalance();

  if (balanceData.error === "Not logged in") {
    showSection(elements.notLoggedIn);
    return;
  }

  if (balanceData.error) {
    elements.balance.textContent = "Error";
    showSection(elements.mainContent);
    return;
  }

  showSection(elements.mainContent);

  // Load waived mode state
  const waivedData = await getWaivedMode();
  elements.waivedCheckbox.checked = waivedData.waived || false;

  // Initial display updates
  await updateBalanceDisplay();
  await updateTrackingDisplay();

  // Update displays every 5 seconds
  setInterval(() => {
    updateTrackingDisplay();
    updateBalanceDisplay();
  }, 5000);
}

// Login button
elements.loginBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "openLogin" });
});

// Dashboard button
elements.dashboardBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "openDashboard" });
});

// Refresh button
elements.refreshBtn.addEventListener("click", async () => {
  elements.balance.textContent = "...";
  const balanceData = await fetchBalance();

  if (balanceData.balance !== undefined) {
    elements.balance.textContent = balanceData.balance.toLocaleString();
  } else if (balanceData.error === "Not logged in") {
    showSection(elements.notLoggedIn);
  } else {
    elements.balance.textContent = "Error";
  }
});

// Waived checkbox
elements.waivedCheckbox.addEventListener("change", async () => {
  await setWaivedMode(elements.waivedCheckbox.checked);
});

// Initialize on popup open
init();
