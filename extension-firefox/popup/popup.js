// Earny Popup Script (Firefox)

const elements = {
  loading: document.getElementById("loading"),
  notLoggedIn: document.getElementById("not-logged-in"),
  mainContent: document.getElementById("main-content"),
  balance: document.getElementById("balance"),
  trackingStatus: document.getElementById("tracking-status"),
  trackingMinutes: document.getElementById("tracking-minutes"),
  trackingTitle: document.getElementById("tracking-title"),
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
  return browser.runtime.sendMessage({ action: "getBalance" });
}

// Get tracking status from background script
async function getTrackingStatus() {
  return browser.runtime.sendMessage({ action: "getTrackingStatus" });
}

// Update tracking display
async function updateTrackingDisplay() {
  const status = await getTrackingStatus();

  if (status.isTracking) {
    elements.trackingStatus.classList.remove("hidden");
    elements.trackingMinutes.textContent = status.accumulatedMinutes;

    if (status.tabTitles && status.tabTitles.length > 0) {
      // Show all playing tab titles, truncated
      const titles = status.tabTitles.map(t =>
        t.length > 35 ? t.substring(0, 35) + "..." : t
      );
      elements.trackingTitle.textContent = titles.join("\n");
    } else {
      elements.trackingTitle.textContent = "";
    }
  } else {
    elements.trackingStatus.classList.add("hidden");
  }
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

  elements.balance.textContent = balanceData.balance.toLocaleString();
  showSection(elements.mainContent);
  updateTrackingDisplay();

  // Update tracking display every second
  setInterval(updateTrackingDisplay, 1000);
}

// Login button
elements.loginBtn.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "openLogin" });
});

// Dashboard button
elements.dashboardBtn.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "openDashboard" });
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

// Initialize on popup open
init();
