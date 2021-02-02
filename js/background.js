import "./common";

const Tabs = new Set();
const Context = {};

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

function tabify() {
  Tabs.clear();
  chrome.tabs.query({}, (list) => {
    for (let item of list) {
      Tabs.add(new Tab(item, Context.Settings));
    }
  });
}

// Listeners

chrome.tabs.onCreated.addListener(tabify);

chrome.tabs.onRemoved.addListener(tabify);

/////

init();
