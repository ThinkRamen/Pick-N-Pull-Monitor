chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isEnabled: true }, () => {
    console.log("Extension installed and enabled by default.");
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
