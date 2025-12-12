// Earny Popup Script

const elements = {
  loading: document.getElementById("loading"),
  notConfigured: document.getElementById("not-configured"),
  notLoggedIn: document.getElementById("not-logged-in"),
  mainContent: document.getElementById("main-content"),
  balance: document.getElementById("balance"),
  trackingStatus: document.getElementById("tracking-status"),
  trackingMinutes: document.getElementById("tracking-minutes"),
  apiUrlInput: document.getElementById("api-url"),
  saveUrlBtn: document.getElementById("save-url"),
  loginBtn: document.getElementById("login-btn"),
  dashboardBtn: document.getElementById("dashboard-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  settingsBtn: document.getElementById("settings-btn"),
};

let apiBase = "";

// Show a section and hide others
function showSection(section) {
  elements.loading.classList.add("hidden");
  elements.notConfigured.classList.add("hidden");
  elements.notLoggedIn.classList.add("hidden");
  elements.mainContent.classList.add("hidden");

  section.classList.remove("hidden");
}

// Get stored API base URL
async function getApiBase() {
  const result = await chrome.storage.local.get(["apiBase"]);
  return result.apiBase || "";
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

// Update tracking display
async function updateTrackingDisplay() {
  const status = await getTrackingStatus();

  if (status.isTracking) {
    elements.trackingStatus.classList.remove("hidden");
    elements.trackingMinutes.textContent = status.accumulatedMinutes;
  } else {
    elements.trackingStatus.classList.add("hidden");
  }
}

// Initialize popup
async function init() {
  showSection(elements.loading);

  apiBase = await getApiBase();

  if (!apiBase) {
    showSection(elements.notConfigured);
    return;
  }

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

// Save API URL
elements.saveUrlBtn.addEventListener("click", async () => {
  let url = elements.apiUrlInput.value.trim();

  // Remove trailing slash
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  if (!url) {
    alert("Please enter a valid URL");
    return;
  }

  await chrome.storage.local.set({ apiBase: url });
  await chrome.runtime.sendMessage({ action: "setApiBase", apiBase: url });
  apiBase = url;

  init();
});

// Login button
elements.loginBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${apiBase}/login` });
});

// Dashboard button
elements.dashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${apiBase}/dashboard` });
});

// Refresh button
elements.refreshBtn.addEventListener("click", async () => {
  elements.balance.textContent = "...";
  const balanceData = await fetchBalance();

  if (balanceData.balance !== undefined) {
    elements.balance.textContent = balanceData.balance.toLocaleString();
  } else {
    elements.balance.textContent = "Error";
  }
});

// Settings button (reset API URL)
elements.settingsBtn.addEventListener("click", async () => {
  if (confirm("Reset server URL configuration?")) {
    await chrome.storage.local.remove(["apiBase"]);
    init();
  }
});

// Initialize on popup open
init();
