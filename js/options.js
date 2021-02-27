"use strict";
const Context = {
  State: new OptionsState(),
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
  if (action === "update" && scope === "all") {
    init();
  }
}

// Form - AutoChange for NewTab Options
const checkboxes = new Map();
const keys = Object.keys(Context.State);
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
      Context.State = store.Settings;
    }

    checkboxes.forEach((checkbox, key) => {
      checkbox.checked = Context.State[key];
    });

    colorInput.value = Context.State.NewTabColor || "";
    colorIndicator.style.backgroundColor = colorInput.value;
  });
}

async function save() {
  checkboxes.forEach((checkbox, key) => {
    Context.State[key] = checkbox.checked;
  });

  Context.State.NewTabColor = colorInput.value;
  send();
}

function send() {
  let msg = {
    action: "options.update",
    payload: Context.State,
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
