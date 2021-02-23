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

function setHostname() {
  const node = document.getElementById("hostname");
  const url = getUrl();
  if (!url) return;

  if (
    url.indexOf("extension://") > -1 &&
    url.indexOf("html/options.html") > -1
  ) {
    return "Options";
  }

  const helper = document.createElement("a");
  helper.setAttribute("href", url);
  node.innerText = helper.hostname;
  Context.isNewTab = helper.hostname === "newtab";
  Context.isRestricted = helper.hostname != "newtab" && !url.startsWith("http");
}

function setBody() {
  document
    .getElementById("content")
    .classList.toggle("hide", Context.isNewTab || Context.isRestricted);
  document.getElementById("newtab").classList.toggle("hide", !Context.isNewTab);
  document
    .getElementById("restricted")
    .classList.toggle("hide", !Context.isRestricted);
}

function setScroll(state) {
  Context.State.EnableAutoScroll = state;
  const checkbox = checkboxes.get("EnableAutoScroll");
  checkbox.checked = state;
}

function sendToBackground(message) {
  chrome.runtime.sendMessage(message);
}

// Think, persist by site? or always in-memory
function commitToStorage() {
  chrome.storage.sync.set({ Settings: Context.State });
}

function send() {
  let msg = {
    action: "update",
    payload: Context.State,
    id: Context.Tab.id,
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
