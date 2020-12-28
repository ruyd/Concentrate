const injectTabId = (callback) =>
  chrome.tabs.executeScript(
    tabId,
    { code: `window.tabId = ${tabId}` },
    callback
  );

const injectFile = () =>
  chrome.tabs.executeScript(tabId, { file: "content.js" });

injectTabId(injectFile);
