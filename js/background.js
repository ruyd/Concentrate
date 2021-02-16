"use strict";
import TabModel from "./TabModel.Settings.js";

const Tabs = new Map();
const Context = {};
const log = console.log.bind(window.console);

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
      if (item) setModel(item);
    }
  });
}
function setModel(item) {
  const model = new TabModel(item, Context.Settings);
  Tabs.set(item.id, model);
}

function onChange(e) {
  const item = e;
  log("change", e);
  setModel(item);
}

// Listeners

chrome.tabs.onCreated.addListener(onChange);

chrome.tabs.onRemoved.addListener(onChange);

chrome.tabs.onActiveChanged.addListener(function (ot) {});

chrome.runtime.onConnect.addListener(onConnect);

function onConnect(port) {
  log(port);
  port.onMessage.addListener(tabMessageHandler);
  port.onDisconnect.addListener(() => {});
}

function tabMessageHandler(message, port) {
  const action = message && message.type;
  const model = port ? Tabs.get(port.sender.tab.id) : null;
  if (!model) {
    console.error("tab without model - bug1", Tabs, message, port);
  }
  switch (action) {
    case "connected":
      if (port) port.postMessage({ action: "model", payload: model });
      break;
    default:
      break;
  }
}

chrome.runtime.onMessage.addListener(runtimeMessageHandler);

function runtimeMessageHandler({ action, payload }, sender, sendResponse) {
  log("BgJS", action, payload);
  const p = payload;
  switch (action) {
    case "update":
      Object.assign(Context.Settings, payload);

      Tabs.forEach((item) => {
        Object.assign(item.SavedSettings, payload);
      });
      break;
    default:
      break;
  }
}

function onNavigate() {}
/////

init();
