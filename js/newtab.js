const Context = {
  State: new NewTabState(),
};
const log = false ? console.trace.bind(window.console) : function () {};

// Listener
chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload }, sender) {
  console.log(action, payload);
  Context.State = payload;
  bind();
}

// Objects
function NewTabState() {
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.ShowClock = true;
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
      Context.State = data.Settings;
    }

    if (Context.State.NewTabClick) {
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

    if (Context.State.NewTabColor) {
      document.body.style.backgroundColor = Context.State.NewTabColor;
      document.body.style.color = Context.State.NewTabColor;
    }

    startTime();
  });
}

function startTime() {
  if (Context.State?.ShowClock) {
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

//init
bind();

