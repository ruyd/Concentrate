import Tab from "./common.js";

const Tabs = new Map();
const Context = {};

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

function tabify() {
  Tabs.clear();
  return chrome.tabs.query({}, (list) => {
    for (let item of list) {
      setModel(item);
    }
  });
}
function setModel(item) {
  const model = new Tab(item, Context.Settings);
  Tabs.set(item.id, model);
  chrome.tabs.sendMessage(item.id, { init: true, model: model });
}

function onChange(e) {
  const item = e.item;
  setModel(item);
}

// Listeners

chrome.tabs.onCreated.addListener(onChange);

chrome.tabs.onRemoved.addListener(onChange);

chrome.tabs.onActiveChanged.addListener(function (ot) {});

/////

init();
