"use strict";
const Tabs = new Map();
const Context = {};
const log = console.trace.bind(window.console);

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

async function onMessageHandler(message, port) {
  const { action, payload, id, scope } = message;
  const senderModel =
    port && port.sender && port.sender.tab
      ? Tabs.get(port.sender.tab.id)
      : null;
  switch (action) {
    case "connected":
      if (!senderModel) {
        console.error("bug1", Tabs, message, port);
      }
      await LoadSavedStateAsync(senderModel);
      if (port) port.postMessage({ action: "model", payload: senderModel });
      break;

    case "update":
      if (scope != "all") {
        let modelUpdate = Tabs.get(id);
        if (!modelUpdate) return;
        Object.assign(modelUpdate.State, payload);
        await CommitSavedStateAsync(modelUpdate);
      } else {
        Object.assign(Context.Settings, payload);
        Tabs.forEach((item) => {
          Object.assign(item.State, payload);
        });
        await commitToStorage({ Settings: Context.Settings });
      }
      break;

    case "state.get":
      const modelState = port ? Tabs.get(payload) : null;
      if (modelState) {
        await LoadSavedStateAsync(modelState);
        sendMessage({
          action: "background.state.set",
          payload: modelState,
          scope,
        });
      }
      break;
    case "scroll.set":
      if (!senderModel) return;
      Object.assign(senderModel.State, payload);
      sendMessage({
        action: "background.scroll.set",
        payload: senderModel,
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
function BackgroundState(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.RemoveAds = true;
  this.RemoveComments = true;
  this.ShowClock = true;
  this.GrayingOn = true;
  this.MutingOn = true;
  this.SkipAds = false;
  this.LabelWindows = true;

  this.Hostname = null;
  this.isNewTab = false;
  this.isAllowed = false;

  if (loaded) {
    Object.assign(this, loaded);
  }
}

function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new BackgroundState(settings);
  const url = GetUrl.apply(this);
  this.State.Hostname = getHostname(url);
  this.State.isNewTab = this.State.Hostname === "newtab";
  this.State.isAllowed = this.State.isNewTab || url.startsWith("http");
}

function GetUrl() {
  if (!this.Tab) {
    return;
  }
  return this.Tab.pendingUrl ? this.Tab.pendingUrl : this.Tab.url;
}

function getHostname(url) {
  if (
    url.indexOf("extension://") > -1 &&
    url.indexOf("html/options.html") > -1
  ) {
    return "options";
  }
  const helper = document.createElement("a");
  helper.setAttribute("href", url);
  return helper.hostname;
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
  log(item, model, Context.Settings);
}

function changeModel(id, action) {
  if (action === "update")
    chrome.tabs.get(id, (tab) => {
      if (tab) setModel(tab);
    });
  else Tabs.delete(id);
}

function commitToStorage(request) {
  log(request);
  return new Promise((resolve) =>
    chrome.storage.sync.set(request, function (result) {
      resolve(result);
    })
  );
}

function fromStorageAsync(request) {
  return new Promise((resolve) =>
    chrome.storage.sync.get(request, (result) => resolve(result))
  );
}

async function CommitSavedStateAsync(model) {
  const url = GetUrl.apply(model);
  const host = getHostname(url);
  if (!host || host === "newtab") return;
  return await commitToStorage({
    [host]: model.State,
  });
}

async function LoadSavedStateAsync(model) {
  const url = GetUrl.apply(model);
  const host = getHostname(url);
  if (!host || host === "newtab") return false;
  const saved = await fromStorageAsync(host);
  if (saved) {
    log(model, saved);
    Object.assign(model.State, saved[host]);
  }
  return true;
}

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

/////
init();
