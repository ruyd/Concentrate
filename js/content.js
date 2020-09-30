var Settings = {};
var current_seconds_counter = 0;
var last_duration = null;
var didWeMute = false;
var didWeCancel = false;
var didWeCancelMuteManually = false;
const debug = true; 
const log = debug ? console.log.bind(window.console) : function(){};
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

//YouTube Noise Removals
const isYoutube = document.getElementById("player");

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
  log('cancel', didWeCancel, didWeCancelMuteManually);
  setTimeout(() => {
    didWeCancel = false;
    log('revert', didWeCancel, didWeCancelMuteManually);
  }, 5000);
};

function getMuteButton() {
  const muteButtons = document.getElementsByClassName("ytp-mute-button");
  return muteButtons.length > 0 ? muteButtons[0] : null;
}

var muteButton = getMuteButton();
if (muteButton) {
  muteButton.addEventListener(
    "click",
    (e) => {
      const showing = document.getElementsByClassName("ad-showing").length > 0;
      if (showing) {
        didWeCancelMuteManually = true;
      }
    },
    false
  );
}

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
  const panel = document.getElementById("movie_player");
  if (!panel || !greyout) return;

  const rect = panel.getBoundingClientRect();

  greyout.style.height = rect.height + "px";
  greyout.style.width = rect.width + "px";
  greyout.style.top = rect.top + "px";
  greyout.style.left = rect.left + "px";
}

function reset_variables() {
  didWeMute = false;
  didWeCancel = false;
  didWeCancelMuteManually = false;
  last_duration = null;
  current_seconds_counter = 0;
}

function isPlaying() {
  //ytp class: paused-mode

  const btns = document.getElementsByClassName("ytp-play-button");
  if (btns.length === 0) return false;
  const btn = btns[0];
  const label = btn.getAttribute("title") ?? "";
  return label.toLowerCase().indexOf("pause") > -1;
}

function isMuted() {
  //change to class
  //ytp-unmute 
  const label = muteButton ? muteButton.getAttribute("title") ?? "" : "";
  return label.toLowerCase().indexOf("unmute") > -1;
}

function muteYouTubeAds() {
  const showing = document.getElementsByClassName("ad-showing").length > 0; //ad-interrupting

  const skips = document.getElementsByClassName("ytp-ad-skip-button");
  const skipButton = skips.length > 0 ? skips[0] : null;
  if (skipButton) {
    log("Skip ad!");
    skipButton.click();
    reset_variables();
    return;
  }

  if (!muteButton) {
    muteButton = getMuteButton();
  }

  if (!showing) {
    if (didWeMute) {
      log("Content back -> unmuting");
      if (muteButton) {
        muteButton.click();
      }
      reset_variables();
    }

    greyout.style.display = "none";
  }

  log('showing', showing, didWeCancel, didWeCancelMuteManually);

  if (showing && !didWeCancel && !didWeCancelMuteManually) {
    if (!isMuted()) {
      log("muting ad");
      if (muteButton) {
        muteButton.click();
      }
      didWeMute = true;
      didWeCancel = false;
      didWeCancelMuteManually = false;
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
    log('refresh abort 1');
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

  log(showing, current_seconds_counter, duration, last_duration);

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
