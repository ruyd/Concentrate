"use strict";
const Tabs = new Map();
const Context = {};
const log = console.log.bind(window.console);

// Listeners
/// Tab Events
chrome.tabs.onUpdated.addListener((tabId) => changeModel(tabId, "update"));
chrome.tabs.onCreated.addListener((tab) => setModel(tab));
chrome.tabs.onRemoved.addListener((tabId) => changeModel(tabId, "remove"));
/// Messaging
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
  const senderModel =
    port && port.sender && port.sender.tab
      ? Tabs.get(port.sender.tab.id)
      : null;
  switch (action) {
    case "connected":
      if (!senderModel) {
        console.error("tab without model - bug1", Tabs, message, port);
      }
      if (port) port.postMessage({ action: "model", payload: senderModel });
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
      log(action, message, port, modelState);
      if (modelState) {
        sendMessage({
          action: "state.set",
          payload: modelState,
        });
      }
      break;
    case "scroll.set":
      senderModel.SavedSettings.EnableAutoScroll = payload;
      sendMessage({
        action: "scroll.set",
        payload: payload,
      });
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

// Objects
function Settings(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.RemoveAds = true;
  this.RemoveComments = true;
  this.ShowClock = true;
  this.GrayingOn = true;
  this.MutingOn = true;
  this.SkipAds = false;
  this.LabelWindowNewTabs = true;

  if (loaded) {
    Object.assign(this, loaded);
  }
}

function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.SavedSettings = new Settings(settings);
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

function changeModel(id, action) {
  if (action === "update")
    chrome.tabs.get(id, (tab) => {
      if (tab) setModel(tab);
    });
  else Tabs.delete(id);
}

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

/////
init();
