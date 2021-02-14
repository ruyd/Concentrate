var Settings = {
  ContentDoubleClick: true,
  NewTabColor: "#242424",
  NewTabClick: true,
  FrameAds: true,
  YouTubeMute: true,
  ShowClock: true,
};

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
      Settings = data.Settings;
    } else {
      //FirstRun Commit Default Settings
      chrome.storage.sync.set({ Settings });
    }

    if (Settings.NewTabClick) {
      document.documentElement.addEventListener(
        "click",
        toggleFullScreen,
        false
      );
    }

    if (Settings.NewTabColor) {
      document.body.style.backgroundColor = Settings.NewTabColor;
      document.body.style.color = Settings.NewTabColor;
    }

    if (Settings.ShowClock) {
      startTime();
    }
  });
}

function unbind() {
  document.documentElement.removeEventListener(
    "click",
    toggleFullScreen,
    false
  );
}

//Listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.Refresh && request.Settings) {
    Settings = request.Settings;

    if (Settings.NewTabClick) bind();
    else unbind();
  }
});

function startTime() {
  if (Settings.ShowClock) {
    document.getElementById("txt").innerHTML = formatAMPM(new Date());
    var t = setTimeout(startTime, 500);
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

//Initial State
bind();

function title() {
  chrome.windows.getCurrent({ populate: true }, (info) => {
    if (!info) return;

    chrome.windows.getAll({ populate: true }, (list) => {
      let index = list.findIndex((i) => i.id === info.id);
      if (index > -1) document.title = "" + String.fromCharCode(index + 65);
    });
  });
}

title();
