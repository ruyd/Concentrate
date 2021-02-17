"use strict";
// Defaults
var SavedSettings = {
  ContentDoubleClick: true,
  NewTabColor: "#242424",
  NewTabClick: true,
  NewTabBookmarks: true,
  RemoveAds: true,
  RemoveComments: true,
  YouTubeMute: true,
  ShowClock: true,
  GrayingOn: true,
  MutingOn: true,
  SkipAds: true,
  LabelWindowNewTabs: true,
};

// Form
const checkboxes = new Map();
const keys = Object.keys(SavedSettings);
keys.forEach((a) => {
  const el = document.getElementById(a + "InputCheckbox");
  if (el) checkboxes.set(a, el);
});

const colorInput = document.getElementById("color");
const colorIndicator = document.getElementById("indicator");

// Actions
function get() {
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

function save() {
  checkboxes.forEach((checkbox, key) => {
    SavedSettings[key] = checkbox.checked;
  });

  SavedSettings.NewTabColor = colorInput.value;

  commitToStorage();
  send();
}

function commitToStorage() {
  chrome.storage.sync.set({ Settings: SavedSettings });
}

function send() {
  let msg = {
    action: "update",
    payload: SavedSettings,
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

// Init
get();
