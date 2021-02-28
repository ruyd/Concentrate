"use strict";
const Context = {
  Settings: new OptionsState(),
};

//Defaults True
function OptionsState() {
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.ShowClock = true;
  this.ContentDoubleClick = true;
  this.RemoveAds = true;
  this.RemoveComments = true;
  this.MutingOn = true;
}

// Listeners
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, scope }) {
  if (action == "popup.update" && scope === "all") {
    init();
  }
}

// Form - AutoChange for NewTab Options
const checkboxes = new Map();
const keys = Object.keys(Context.Settings);
keys.forEach((a) => {
  const el = document.getElementById(a + "InputCheckbox");
  if (el) checkboxes.set(a, el);
});

const colorInput = document.getElementById("color");
const colorIndicator = document.getElementById("indicator");

// Actions
function init() {
  chrome.storage.sync.get("Settings", function (store) {
    if (store.Settings) {
      Context.Settings = store.Settings;
    }

    checkboxes.forEach((checkbox, key) => {
      checkbox.checked = Context.Settings[key];
    });

    colorInput.value = Context.Settings.NewTabColor || "";
    colorIndicator.style.backgroundColor = colorInput.value;
  });
}

async function save() {
  checkboxes.forEach((checkbox, key) => {
    Context.Settings[key] = checkbox.checked;
  });

  Context.Settings.NewTabColor = colorInput.value;
  send();
}

function send() {
  let msg = {
    action: "options.update",
    payload: Context.Settings,
    scope: "all",
  };

  // BgJS
  chrome.runtime.sendMessage(msg);

  // ContentJS as Runtime
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
}

// Events
checkboxes.forEach((checkbox, key) => {
  checkbox.onchange = save;
});

colorInput.onchange = () => {
  colorIndicator.style.backgroundColor = colorInput.value;
  save();
};

colorInput.onkeyup = () => {
  colorIndicator.style.backgroundColor = colorInput.value;
};

init();
