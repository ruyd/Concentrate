var Settings = {};
var current_seconds_counter = 0;
var last_duration = null;
var didWeMute = false;
var didWeCancel = false;

function get() {
  chrome.storage.sync.get("Settings", function (data) {
    Settings = data.Settings;
  });
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function injectStyle() {
  var style = document.createElement("style");
  style.innerHTML =
    ".concentrate {" +
    "  display: none;" +
    "  color: #242424;" +
    "  background-color: #242424;" +
    "  opacity: 1;" +
    "  z-index: 99999;" +
    "  position: fixed;" +
    "  height: 100%;" +
    "  width: 100%;" +
    "  top: 0; left: 0;" +
    "  transition: all 0.3s;" +
    "  user-select: none;" +
    "}" +
    ".concentrate:hover {" +
    "  opacity: 0;" +
    "}" +
    ".remaining {" +
    "  display: block;" +
    "  color: rgba(28, 28, 28, 1) !important;" +
    "  font-size: 300%;" +
    "  position: relative;" +
    "  height: 100px;" +
    "  width: 200px;" +
    "  text-align:center;" +
    "  top: 50%; left: 45%;" +
    "  user-select: none;" +
    "}";

  const ref = document.querySelector("script");
  ref.parentNode.insertBefore(style, ref);
}

function bind() {
  chrome.storage.sync.get("Settings", function (data) {
    Settings = data.Settings;

    if (Settings.ContentDoubleClick) {
      document.documentElement.addEventListener(
        "dblclick",
        toggleFullScreen,
        false
      );
    }
  });
}

function unbind() {
  document.documentElement.removeEventListener(
    "dblclick",
    toggleFullScreen,
    false
  );
}

//Listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.Refresh && request.Settings) {
    Settings = request.Settings;

    if (Settings.ContentDoubleClick) bind();
    else unbind();
  }
});

//Initial State
bind();
injectStyle();

const greyout = document.createElement("div");
greyout.setAttribute("id", "greyout");
greyout.setAttribute("class", "concentrate");
const remaining = document.createElement("div");
remaining.setAttribute("class", "remaining");
greyout.appendChild(remaining);
document.body.appendChild(greyout);

greyout.onmouseover = () => {
  greyout.style.display = "none";
  didWeCancel = true;
  setTimeout(() => {
    didWeCancel = false;
  }, 5000);
};

//YouTube Noise Removals
const isYoutube = document.getElementById("player");

function removeVideoAds() {
  let names = [
    "video-ads",
    "ytd-player-legacy-desktop-watch-ads-renderer",
    "ytd-watch-next-secondary-results-renderer sparkles-light-cta",
  ];

  for (let name of names) {
    removeClassName(name);
  }
}

function removeClassName(name) {
  let elements = document.getElementsByClassName(name);
  for (let i = 0; i < elements.length; i++) {
    elements[i].remove();
  }
}

function resize() {
  let panel = document.getElementById("movie_player");
  if (!panel || !greyout) return;

  let coor = panel.getBoundingClientRect();

  greyout.style.height = coor.height + "px";
  greyout.style.width = coor.width + "px";
  greyout.style.top = coor.top + "px";
  greyout.style.left = coor.left + "px";
}

function isPlaying() {
  const btns = document.getElementsByClassName("ytp-play-button");
  const btn = btns.length > 0 ? btns[0] : null;
  return btn
    ? btn.getAttribute("aria-label").toLowerCase().indexOf("pause") > -1
    : false;
}

function muteYouTubeAds() {
  const btns = document.getElementsByClassName("ytp-mute-button");
  const btn = btns.length > 0 ? btns[0] : null;
  const muted = btn
    ? btn.getAttribute("aria-label").toLowerCase().indexOf("unmute") > -1
    : false;

  const showing = document.getElementsByClassName("ad-showing").length > 0; //ad-interrupting

  if (!showing) {
    if (didWeMute) {
      console.log("Content back -> unmuting");
      btn.click();
      didWeMute = false;
      didWeCancel = false;
      last_duration = null;
      current_seconds_counter = 0;
    }

    greyout.style.display = "none";
  }

  if (showing && !didWeCancel) {
    if (!muted) {
      console.log("muting ad");
      btn.click();
      didWeMute = true;
      refresh(true);
    }

    resize();
    greyout.style.display = "block";
  }
}

function removeFrameAds() {
  const frames = document.getElementsByTagName("IFRAME");
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const id = frame.getAttribute("id") || frame.getAttribute("name");
    const adish = id ? id.indexOf("_ads") > -1 : false;
    const src = frame.getAttribute("src") || "";
    const srcadish =
      src.indexOf("ads") > -1 ||
      src.indexOf("doubleclick") > -1 ||
      src.indexOf("about:blank") > -1;
    if (adish || srcadish) {
      frame.remove();
    }
  }
}

function observerCallback(mutationsList, observer) {
  for (const mutation of mutationsList) {
  }
}

function refresh(starting = false) {
  const showing = document.getElementsByClassName("ad-showing").length > 0;
  if (!showing) {
    return;
  }

  if (!isPlaying()) {
    remaining.innerText = "Paused";
    return;
  }

  //const currents = document.getElementsByClassName("ytp-time-current");
  const durations = document.getElementsByClassName("ytp-time-duration");
  const duration = durations.length > 0 ? durations[0].textContent : null;
  const dsplit = (duration || "").split(":");
  const duration_seconds = parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);

  if (starting || duration_seconds !== last_duration) {
    current_seconds_counter = duration_seconds;
  } else {
    current_seconds_counter--;
  }

  last_duration = duration_seconds;

  let minutes = 0;
  let seconds =
    current_seconds_counter > 0
      ? current_seconds_counter
      : current_seconds_counter * -1;

  if (seconds >= 60) {
    const m = (seconds / 60) << 0;
    minutes += m;
    seconds -= 60 * m;
  }

  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  // console.log(showing, current_seconds_counter, duration, last_duration);

  if (showing && remaining && duration) {
    remaining.innerText = `${minutes}:${seconds} / ${duration}`;
  } else {
    remaining.innerText = "";
  }
}

//CB Mute - ToDo

function startTime() {
  if (isYoutube) {
    refresh();
  }

  if (Settings.FrameAds) {
    removeFrameAds();
  }

  if (Settings.YouTubeMute) {
    muteYouTubeAds();
    removeVideoAds();
  }

  var t = setTimeout(startTime, 1000);
}

startTime();
