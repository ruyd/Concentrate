"use strict";
const Tabs = new Map();
const Context = {};
const log = true ? console.trace.bind(window.console) : function () {};

// Listeners
chrome.tabs.onUpdated.addListener((tabId) => changeModel(tabId, "update"));
chrome.tabs.onCreated.addListener((tab) => setModel(tab));
chrome.tabs.onRemoved.addListener((tabId) => changeModel(tabId, "remove"));
chrome.runtime.onConnect.addListener(onConnect);
chrome.runtime.onMessage.addListener(runtimeMessageHandler);

// Objects
function BackgroundState(loaded) {
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
  this.id = chrome_tab.id;
  const url = GetUrl.apply(this);
  this.State.Hostname = getHostname(url);
  this.State.isNewTab = this.State.Hostname === "newtab";
  this.State.isAllowed = this.State.isNewTab || url.startsWith("http");
}

/// Messaging
function onConnect(port) {
  port.onMessage.addListener(onMessageHandler);
  port.onDisconnect.addListener(() => {
    if (port) {
      port.Closed = true;
    }
  });
}

async function onMessageHandler(message, port) {
  log(message, port);
  const { action, payload, id, scope } = message;
  const { sender } = port;
  const tabId = sender?.tab ? sender.tab.id : id;
  const model = Tabs.get(tabId);
  switch (action) {
    case "content.connected":
      await LoadSavedStateAsync(model);
      port.postMessage({ action: "model", payload: model });
      break;

    case "popup.state.get":
      await LoadSavedStateAsync(model);
      stateToOthers(model);
      break;

    case "options.update":
    case "popup.update":
    case "content.state":
      if (scope === "tab") {
        Object.assign(model.State, payload);
        await CommitSavedStateAsync(model);
      } else {
        Object.assign(Context.Settings, payload);
        Tabs.forEach((item) => {
          Object.assign(item.State, payload);
        });
        await commitToStorage({ Settings: Context.Settings });
      }
      stateToOthers(model);
      break;
  }
}

function runtimeMessageHandler(message, sender, sendResponse) {
  onMessageHandler(message, sender);
}

function sendMessage(message) {
  chrome.runtime.sendMessage(message);
}

function stateToOthers(model) {
  sendMessage({
    action: "background.state",
    payload: model,
    id: model.id,
  });
}

// Actions

// Defaults for New Sites
function checkDefaults(model) {
  if (model.State.hasOwnProperty("ContentDoubleClick")) return;
  model.State.ContentDoubleClick = true;
  model.State.RemoveAds = true;
  model.State.RemoveComments = true;
  model.State.MutingOn = true;
  model.State.AutoScrollSpeed = 5;
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
  checkDefaults(model);
  Tabs.set(item.id, model);
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
  if (model.State.isNewTab) return false;
  const host = model.State.Hostname;
  return await commitToStorage({
    [host]: model.State,
  });
}

async function LoadSavedStateAsync(model) {
  if (model.State.isNewTab) return false;
  const host = model.State.Hostname;
  const saved = await fromStorageAsync(host);
  if (saved[host]) {
    log(model, saved);
    Object.assign(model.State, saved[host]);
    model.State.fromStorage = true;
  }
  return true;
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

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    tabify();
  });
}

/////
init();
