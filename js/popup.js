"use strict";
const Context = {
  Tab: null,
  State: {
    ContentDoubleClick: true,
    RemoveAds: true,
    RemoveComments: true,
    MutingOn: true,
    EnableAutoScroll: false,
    SkipAds: true,
    NewTabClick: true,
    ShowClock: true,
    AutoScrollSpeed: 5,
  },
};
const log = console.log.bind(window.console);

// Listeners
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload, scope }) {
  log(action, payload);
  switch (action) {
    case "background.state.set":
      setState(payload, scope);
      break;
    case "background.scroll.set":
      setState(payload, scope);
      break;
    default:
      break;
  }
}

// Form
const checkboxes = new Map();
const keys = Object.keys(Context.State);
keys.forEach((key) => {
  const el = document.getElementById(key + "InputCheckbox");
  if (el) checkboxes.set(key, el);
});

// Bind
function bind() {
  // Form
  checkboxes.forEach((input) => (input.onclick = onClickHandler));
  function onClickHandler(e) {
    checkboxes.forEach((checkbox, key) => {
      Context.State[key] = checkbox.checked;
    });
    sendUpdate();
  }

  // AutoScroll

  const slower = document.getElementById("slower");
  slower.onmousedown = (e) => {
    log(e);
    Context.IsMouseDown = true;
    mouseTimer(-1);
  };
  slower.onmouseup = () => (Context.IsMouseDown = false);

  const faster = document.getElementById("faster");
  faster.onmousedown = (e) => {
    log(e);
    Context.IsMouseDown = true;
    mouseTimer(1);
  };
  faster.onmouseup = () => (Context.IsMouseDown = false);
}

// Actions
function mouseTimer(move) {
  if (Context.IsMouseDown) {
    scrollSpeed(move);
    setTimeout(() => mouseTimer(move), 500);
  }
}

function scrollSpeed(move) {
  sendToTab({
    action: "scroll.speed",
    payload: move,
  });
}

function init() {
  requestState("init");
}

function requestState(scope) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (let tab of tabs) {
      sendToBackground({
        action: "state.get",
        payload: tab.id,
        scope,
      });
    }
  });
}

async function setState({ State, Tab, SavedState, SavedSettings }, scope) {
  Context.Tab = Tab;

  let state = State;
  if (scope === "init" || Object.keys(State).length === 0) {
    state = SavedState || SavedSettings;
  }

  Object.assign(Context.State, state);

  checkboxes.forEach((checkbox, key) => {
    checkbox.checked = Context.State[key];
  });

  setHostname();
  setBody();
  setScroll();
}

function getUrl() {
  return Context.Tab.pendingUrl ? Context.Tab.pendingUrl : Context.Tab.url;
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

function setHostname() {
  const url = getUrl();
  if (!url) return;
  const allowed = ["newtab"];
  Context.Hostname = getHostname(url);
  Context.isNewTab = Context.Hostname === "newtab";
  Context.isAllowed =
    allowed.includes(Context.Hostname) || url.startsWith("http");

  document.getElementById("hostname").innerText = Context.Hostname;
}

function setBody() {
  document
    .getElementById("content")
    .classList.toggle("hide", !Context.isAllowed || Context.isNewTab);
  document.getElementById("newtab").classList.toggle("hide", !Context.isNewTab);
  document
    .getElementById("restricted")
    .classList.toggle("hide", Context.isAllowed);
}

function setScroll() {
  const checkbox = checkboxes.get("EnableAutoScroll");
  checkbox.checked = Context.State.EnableAutoScroll;
  document.getElementById("speed").innerText =
    Context.State.AutoScrollSpeed || "";
}

function sendToBackground(message) {
  chrome.runtime.sendMessage(message);
}

function sendUpdate() {
  let msg = {
    action: "update",
    payload: Context.State,
    id: Context.Tab.id,
    scope: Context.isNewTab ? "all" : "tab",
  };

  sendToBackground(msg);
  sendToTab(msg);
}

function sendToTab(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
}

//////
bind();
init();
