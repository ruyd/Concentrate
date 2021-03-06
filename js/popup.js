"use strict";
const Context = {
  TabId: null,
  Tab: null,
  State: new PopupState(),
};
const log = false ? console.trace.bind(window.console) : function () {};

// Listeners
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload, scope, id }) {
  log(action, payload);
  if (Context.TabId != id && scope != "all") {
    log("blocked");
    return;
  }
  switch (action) {
    case "background.model":
      setModel(payload);
      break;
    case "options.update":
    case "background.state":
      updateState(payload);
      break;
  }
}

// Objects
function PopupState() {
  this.ContentDoubleClick = false;
  this.RemoveAds = false;
  this.RemoveComments = false;
  this.MutingOn = false;
  this.EnableAutoScroll = false;
  this.AutoScrollSpeed = -1;
  this.NewTabClick = false;
  this.ShowClock = false;
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

    //Hackish hmm
    Context.State.GrayingOn = Context.State.MutingOn;

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
  Context.State.AutoScrollSpeed += move;
  sendUpdate();
}

function requestTabContext() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (let tab of tabs) {
      Context.TabId = tab.id;
      sendToBackground({
        action: "popup.model",
        id: tab.id,
      });
    }
  });
}

function setModel({ State, Tab }) {
  Context.Tab = Tab;
  updateState(State);
}

function updateState(state) {
  Object.assign(Context.State, state);
  checkboxes.forEach((checkbox, key) => {
    checkbox.checked = Context.State[key];
  });

  setBody();
  setScroll();
}

function setBody() {
  document
    .getElementById("content")
    .classList.toggle(
      "hide",
      !Context.State.isAllowed || Context.State.isNewTab
    );
  document
    .getElementById("newtab")
    .classList.toggle("hide", !Context.State.isNewTab);
  document
    .getElementById("restricted")
    .classList.toggle("hide", Context.State.isAllowed);
  document.getElementById("hostname").innerText = Context.State.Hostname;
}

function setScroll() {
  const checkbox = checkboxes.get("EnableAutoScroll");
  checkbox.checked = Context.State.EnableAutoScroll;
  document.getElementById("speed").innerText =
    Context.State.AutoScrollSpeed || "?";
}

function sendToBackground(message) {
  chrome.runtime.sendMessage(message);
}

function sendUpdate() {
  let msg = {
    action: "popup.update",
    payload: Context.State,
    id: Context.TabId,
    scope: Context.State.isNewTab ? "all" : "tab",
  };

  sendToBackground(msg);
  sendToTab(msg);
  log(msg);
}

function sendToTab(msg) {
  chrome.tabs.sendMessage(Context.Tab.id, msg);
}

//////
bind();
requestTabContext();
