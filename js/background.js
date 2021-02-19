"use strict";
import TabModel from "./TabModel.Settings.js";

const Tabs = new Map();
const Context = {};
const log = console.log.bind(window.console);

// Listeners

chrome.tabs.onCreated.addListener(onChange);

chrome.tabs.onRemoved.addListener(onChange);

chrome.tabs.onActiveChanged.addListener(function (ot) {});

chrome.runtime.onConnect.addListener(onConnect);

function onConnect(port) {
  port.onMessage.addListener(onMessageHandler);
  port.onDisconnect.addListener(() => {
    if (port) {
      port.Closed = true;
    }
  });
}

function onMessageHandler(message, port) {
  const { action, payload, id } = message;
  switch (action) {
    case "connected":
      let model = port ? Tabs.get(port.sender.tab.id) : null;
      if (!model) {
        console.error("tab without model - bug1", Tabs, message, port);
      }
      if (port) port.postMessage({ action: "model", payload: model });
      break;

    case "update":
      if (id) {
        let modelUpdate = Tabs.get(id);
        if (modelUpdate) Object.assign(modelUpdate.SavedSettings, payload);
        log("state.set", modelUpdate);
      } else {
        Object.assign(Context.Settings, payload);
        Tabs.forEach((item) => {
          Object.assign(item.SavedSettings, payload);
        });
      }
      break;

    case "state.get":
      let modelState = port ? Tabs.get(payload) : null;
      log("state.get", message, port, modelState);
      if (modelState) {
        sendMessage({
          action: "state.set",
          payload: modelState,
        });
      }
      break;

    default:
      break;
  }
}

chrome.runtime.onMessage.addListener(runtimeMessageHandler);
function runtimeMessageHandler(message, sender, sendResponse) {
  onMessageHandler(message, sender);
}

function sendMessage(message) {
  chrome.runtime.sendMessage(message);
}

// Actions

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

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

/////

init();
