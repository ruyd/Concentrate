"use strict";
// Defaults
var SavedSettings = {
  ContentDoubleClick: true,
  NewTabColor: "#242424",
  NewTabClick: true,
  NewTabBookmarks: true,
  RemoveAds: true,
  RemoveComments: true,
  ShowClock: true,
  GrayingOn: true,
  MutingOn: true,
  SkipAds: true,
  LabelWindow: true,
};

// Listeners
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, scope }) {
  if (action === "update" && scope === "all") {
    init();
  }
}

// Form - AutoChange for NewTab Options
const checkboxes = new Map();
const keys = Object.keys(SavedSettings);
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
      SavedSettings = store.Settings;
    } else {
      // FirstRun Commit Default SavedSettings
      commitToStorage();
    }

    checkboxes.forEach((checkbox, key) => {
      checkbox.checked = SavedSettings[key];
    });

    colorInput.value = SavedSettings.NewTabColor || "";
    colorIndicator.style.backgroundColor = colorInput.value;
  });
}

async function save() {
  checkboxes.forEach((checkbox, key) => {
    SavedSettings[key] = checkbox.checked;
  });

  SavedSettings.NewTabColor = colorInput.value;
  send();
}

function send() {
  let msg = {
    action: "update",
    payload: SavedSettings,
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
