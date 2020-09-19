const doubleClickInputCheckbox = document.getElementById("DoubleClickInputCheckbox");
const youTubeInputCheckbox = document.getElementById("YouTubeInputCheckbox");
const iFrameInputCheckbox = document.getElementById("iFrameInputCheckbox");
const clickInputCheckbox = document.getElementById("ClickInputCheckbox");
const clockInputCheckbox = document.getElementById("ClockInputCheckbox");
const colorInput = document.getElementById("color");
const colorIndicator = document.getElementById("indicator");

var Settings = {
  ContentDoubleClick: true,
  NewTabColor: "#242424",
  NewTabClick: true,
  FrameAds: true,
  YouTubeMute: true,
  ShowClock: true,
};

function get() {
  chrome.storage.sync.get("Settings", function (data) {
    if (data.Settings) {
      Settings = data.Settings;
    } else {
      //FirstRun Commit Default Settings
      chrome.storage.sync.set({ Settings });
    }

    doubleClickInputCheckbox.checked = Settings.ContentDoubleClick;
    iFrameInputCheckbox.checked = Settings.FrameAds;
    clickInputCheckbox.checked = Settings.NewTabClick;
    youTubeInputCheckbox.checked = Settings.YouTubeMute;
    clockInputCheckbox.checked = Settings.ShowClock;
    colorInput.value = Settings.NewTabColor || "";
    colorIndicator.style.backgroundColor = colorInput.value;
  });
}

function save() {
  Settings.ContentDoubleClick = doubleClickInputCheckbox.checked;
  Settings.NewTabColor = colorInput.value;
  Settings.NewTabClick = clickInputCheckbox.checked;
  Settings.FrameAds = iFrameInputCheckbox.checked;
  Settings.YouTubeMute = youTubeInputCheckbox.checked;
  Settings.ShowClock = clockInputCheckbox.checked;

  chrome.storage.sync.set({ Settings });
  send();
}

function send() {
  let msg = {
    From: "options",
    Refresh: true,
    Settings: Settings,
  };

  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
}

//Events

doubleClickInputCheckbox.onchange = save;
youTubeInputCheckbox.onchange = save;
iFrameInputCheckbox.onchange = save;
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
