"use strict";

var SavedSettings = {
  ContentDoubleClick: true,
  NewTabColor: "#242424",
  NewTabClick: true,
  RemoveAds: true,
  RemoveComments: true,
  YouTubeMute: true,
  ShowClock: true,
  GrayingOn: true,
  MutingOn: true,
  SkipAds: true,
  LabelWindowNewTabs: true,
};

const doubleClickInputCheckbox = document.getElementById(
  "DoubleClickInputCheckbox"
);
const youTubeAdsInputCheckbox = document.getElementById(
  "YouTubeAdsInputCheckbox"
);
const removeAdsInputCheckbox = document.getElementById(
  "RemoveAdsInputCheckbox"
);
const removeCommentsInputCheckbox = document.getElementById(
  "RemoveCommentsInputCheckbox"
);
const clickInputCheckbox = document.getElementById("ClickInputCheckbox");
const clockInputCheckbox = document.getElementById("ClockInputCheckbox");
const colorInput = document.getElementById("color");
const colorIndicator = document.getElementById("indicator");

function get() {
  chrome.storage.sync.get("Settings", function (store) {
    if (store.Settings) {
      SavedSettings = store.Settings;
    } else {
      //FirstRun Commit Default SavedSettings
      commitToStorage();
    }

    doubleClickInputCheckbox.checked = SavedSettings.ContentDoubleClick;
    removeAdsInputCheckbox.checked = SavedSettings.RemoveAds;
    clickInputCheckbox.checked = SavedSettings.NewTabClick;
    youTubeAdsInputCheckbox.checked = SavedSettings.YouTubeMute;
    removeCommentsInputCheckbox.checked = SavedSettings.RemoveComments;
    clockInputCheckbox.checked = SavedSettings.ShowClock;
    colorInput.value = SavedSettings.NewTabColor || "";
    colorIndicator.style.backgroundColor = colorInput.value;
  });
}

function save() {
  SavedSettings.ContentDoubleClick = doubleClickInputCheckbox.checked;
  SavedSettings.NewTabColor = colorInput.value;
  SavedSettings.NewTabClick = clickInputCheckbox.checked;
  SavedSettings.RemoveAds = removeAdsInputCheckbox.checked;
  SavedSettings.YouTubeMute = youTubeAdsInputCheckbox.checked;
  SavedSettings.RemoveComments = RemoveCommentsInputCheckbox.checked;
  SavedSettings.ShowClock = clockInputCheckbox.checked;

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

  //BgJS
  chrome.runtime.sendMessage(msg);

  //ContentJS as Runtime
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
}

//Events

doubleClickInputCheckbox.onchange = save;
youTubeAdsInputCheckbox.onchange = save;
removeCommentsInputCheckbox.onchange = save;
removeAdsInputCheckbox.onchange = save;
clickInputCheckbox.onchange = save;
clockInputCheckbox.onchange = save;
colorInput.onchange = () => {
  colorIndicator.style.backgroundColor = colorInput.value;
  save();
};

colorInput.onkeyup = () => {
  colorIndicator.style.backgroundColor = colorInput.value;
};

get();
