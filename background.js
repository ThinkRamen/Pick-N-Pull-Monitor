chrome.runtime.onInstalled.addListener(() => {
  // set default values for storage
  chrome.storage.local.set({ isEnabled: true }, () => {
    console.log("Extension installed and enabled by default.");
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// on startup, check for inventory updates
chrome.runtime.onStartup.addListener(() => {
  checkForInventoryUpdates();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkForInventoryUpdates") {
    console.log("checking for inventory updates...");
    try {
      checkForInventoryUpdates();
      console.log("inventory check completed.");
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error checking for inventory updates:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
});

// configure the time interval for checking inventory updates
let CHECK_INTERVAL = 10; // 10 minutes
let CHECK_INTERVAL_TEST = 1; // 1 minute for testing
CHECK_INTERVAL = CHECK_INTERVAL_TEST; // set to test interval for testing
// alarm setup to poll every 10 minutes
chrome.alarms.create("inventoryCheck", {
  periodInMinutes: CHECK_INTERVAL,
});
// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "inventoryCheck") {
    // Fetch the inventory from the target URL
    checkForInventoryUpdates();
    console.log("checking for inventory updates...");
  }
});

// when local storage is updated, check for updates
chrome.storage.onChanged.addListener((changes, area) => {
  console.log("storage modifed...\n");
  if (area === "local" && changes.searches) {
    console.log("searches updated...\n", changes.searches.newValue);
    // check for inventory updates
    checkForInventoryUpdates();
  }
});

// check for inventory updates
async function checkForInventoryUpdates() {
  // get searches from chrome storage
  let searches = (await chrome.storage.local.get("searches")) || [];
  console.log("getting searches from local storage...\n", searches);
  // for every search in searches, fetch inventory from their url
  searches = searches.searches || []; // ensure searches is an array
  console.log("searches:\n", searches);
  searches.forEach(async (search) => {
    try {
      const response = await fetch(search.url, {
        credentials: "include",
        headers: {
          Origin: "https://www.picknpull.com",
        },
      });
    } catch (error) {
      console.error(`Failed to fetch ${search.url}:`, error);
    }
  });
}

// notification function
function notifyUser(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: title,
    message: message,
  });
}
