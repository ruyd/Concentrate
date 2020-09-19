var Settings = {};

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
  
    if (!data.Settings) return;

    console.log('get', data);

    Settings = data.Settings;

    if (Settings.NewTabClick) {
      console.log('click enabled');
      document.documentElement.addEventListener(
        "click",
        toggleFullScreen,
        false
      );
    }

    if (Settings.NewTabColor) {
      console.log('color', Settings.NewTabColor)
      document.body.style.backgroundColor = Settings.NewTabColor;
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
  document.getElementById("txt").innerHTML = formatAMPM(new Date());
  if (Settings.ShowClock) {
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

//document.body.onload = () => startTime();
//Initial State
bind();
