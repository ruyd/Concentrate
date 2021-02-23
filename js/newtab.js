const Context = {
  Settings: {
    NewTabColor: "#242424",
    NewTabClick: true,
    ShowClock: true,
    WindowLabels: false,
  },
};

//Listener
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload }, sender) {
  Context.Settings = payload;
  bind();
}

// Actions
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function bind() {
  chrome.storage.sync.get("Settings", function (data) {
    if (data.Settings) {
      Context.Settings = data.Settings;
    } else {
      //FirstRun Commit Default Settings
      chrome.storage.sync.set({ Settings: Context.Settings });
    }

    if (Context.Settings.NewTabClick) {
      if (!Context.ClickBound) {
        Context.ClickBound = true;
        document.documentElement.addEventListener(
          "click",
          toggleFullScreen,
          false
        );
      }
    } else {
      Context.ClickBound = false;
      document.documentElement.removeEventListener(
        "click",
        toggleFullScreen,
        false
      );
    }

    if (Context.Settings.NewTabColor) {
      document.body.style.backgroundColor = Context.Settings.NewTabColor;
      document.body.style.color = Context.Settings.NewTabColor;
    }

    startTime();
  });
}

function startTime() {
  if (Context.Settings.ShowClock) {
    document.getElementById("txt").innerHTML = formatAMPM(new Date());
    Context.timeout = setTimeout(startTime, 500);
  } else {
    document.getElementById("txt").innerHTML = "";
  }
}

function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
}

function title() {
  if (!Context.Settings.EnableWindowLabels) return;
  chrome.windows.getCurrent({ populate: true }, (info) => {
    if (!info) return;
    chrome.windows.getAll({ populate: true }, (list) => {
      let index = list.findIndex((i) => i.id === info.id);
      if (index > -1) document.title = "" + String.fromCharCode(index + 65);
    });
  });
}

//Initial State
bind();
