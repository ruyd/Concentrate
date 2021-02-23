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
  },
};
const log = console.log.bind(window.console);

// Listeners
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload }) {
  log(action, payload);
  switch (action) {
    case "state.set":
      setState(payload);
      break;
    case "scroll.set":
      setScroll(payload);
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

    send();
  }

  // AutoScroll
  document.getElementById("slower").onclick = () => scrollSpeed(-1);
  document.getElementById("faster").onclick = () => scrollSpeed(1);
}

// Actions
function scrollSpeed(move) {
  sendToTab({
    action: "scroll.speed",
    payload: move,
  });
}

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (let tab of tabs) {
      sendToBackground({
        action: "state.get",
        payload: tab.id,
      });
    }
  });
}

function setState({ Tab, SavedSettings }) {
  Context.Tab = Tab;
  Object.assign(Context.State, SavedSettings);
  checkboxes.forEach((checkbox, key) => {
    checkbox.checked = Context.State[key];
  });

  setHostname();
  setBody();
  console.log("state", SavedSettings, Tab);
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

function setScroll(state) {
  Object.assign(Context.State, state);
  const checkbox = checkboxes.get("EnableAutoScroll");
  checkbox.checked = state;
}

function sendToBackground(message) {
  chrome.runtime.sendMessage(message);
}

function send() {
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
