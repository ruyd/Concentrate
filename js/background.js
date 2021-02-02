const Tabs = new Set();
const Context = {};

function init() {
  chrome.storage.sync.get("Settings", function (data) {
    Context.Settings = data.Settings;
    chrome.tabs.query({}, (list) => {
      for (let item of list) {
        Tabs.add(new Tab(item, data.Settings));
      }
    });
  });
}

//Events

chrome.tabs.onCreated.addListener(function () {});

chrome.tabs.onRemoved.addListener(function () {});

function Tab(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new TabState(settings);
  this.Overlay = {};
  this.SoundButton = {};
  this.OverlayButton = {};
}

function TabState(settings) {
  this.grayingOn = settings.GrayingOn;
  this.mutingOn = settings.MutingOn;
  this.skipOn = true;
  this.didWeMute = false;
  this.current_seconds_counter = 0;
  this.last_duration = null;
  this.isYouTube = false;
}

function Settings(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.FrameAds = true;
  this.YouTubeMute = true;
  this.ShowClock = true;
  if (loaded) {
    Object.assign(loaded, this);
  }
}

/////

init();
