var Settings = {};
var Context = {
  GrayingOn: true,
  MutingOn: true,
  SkipOn: false,
  DidWeMute: false,
};

var current_seconds_counter = 0;
var last_duration = null;

const debug = true;
const log = debug ? console.log.bind(window.console) : function () {};
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

//YouTube Noise Removals
const isYoutube = document.getElementById("player");

const greyout = document.createElement("div");
greyout.setAttribute("id", "greyout");
greyout.setAttribute("class", "concentrate");

const remaining = document.createElement("div");
remaining.setAttribute("class", "remaining");
greyout.appendChild(remaining);
document.body.appendChild(greyout);

const power_button = document.createElement("div");
power_button.setAttribute("id", "power");
power_button.setAttribute("class", "on");
power_button.setAttribute("title", "Show");
power_button.onclick = () => {
  const active = power_button.getAttribute("class") === "on";
  power_button.setAttribute("class", active ? "off" : "on");
  greyout.style.display = active ? "none" : "display";
  Context.GrayingOn = !active;
};
greyout.appendChild(power_button);

const audio_button = document.createElement("div");
audio_button.setAttribute("id", "audio");
audio_button.setAttribute("class", "on");
audio_button.setAttribute("title", "Listen");
audio_button.onclick = () => {
  const active = audio_button.getAttribute("class") === "on";
  audio_button.setAttribute("class", active ? "off" : "on");  
  Context.MutingOn = !active;
};
greyout.appendChild(audio_button);


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
  Context.DidWeMute = false;
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
  if (skipButton && Context.SkipOn) {
    log("Skip ad!");
    skipButton.click();
    reset_variables();
    return;
  }

  if (!muteButton) {
    muteButton = getMuteButton();
  }

  if (!showing) {
    if (Context.DidWeMute) {
      log("Content back -> unmuting");
      if (muteButton) {
        muteButton.click();
      }
      reset_variables();
    }

    greyout.style.display = "none";
  }

  log("showing", showing, Context);

  if (showing) {
    if (Context.MutingOn && !isMuted()) {
      log("muting ad");
      if (muteButton) {
        muteButton.click();
      }
      refresh(true);
    } else {
      refresh();
    }

    if (Context.GrayingOn) {
      resize();
      greyout.style.display = "block";
    }
  }
}

function refresh(starting = false) {
  const showing = document.getElementsByClassName("ad-showing").length > 0;
  if (!showing) {
    log("not showing");
    return;
  }

  if (!isPlaying()) {
    remaining.innerText = "Paused";
    log("refresh abort 1");
    return;
  }

  //const currents = document.getElementsByClassName("ytp-time-current");
  const durations = document.getElementsByClassName("ytp-time-duration");
  const duration = durations.length > 0 ? durations[0].textContent : null;
  const dsplit = (duration || "").split(":");
  const duration_seconds = parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);

  if (starting || duration !== last_duration) {
    log("duration reset");
    current_seconds_counter = duration_seconds;
  } else {
    log("duration minus");
    current_seconds_counter--;
  }

  last_duration = duration;
  if (current_seconds_counter < 0) {
    log("negative reset");
    current_seconds_counter = duration;
  }

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
    log("blank");
    remaining.innerText = "";
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

  removeClass("OUTBRAIN");
}

function removeClass(name) {
  const elements = document.getElementsByClassName(name);
  for (let el of elements) {
    el.remove();
  }
}

function observerCallback(mutationsList, observer) {
  for (const mutation of mutationsList) {
  }
}

//CB Mute - ToDo

function startTime() {
  if (Settings.FrameAds) {
    removeFrameAds();
  }

  if (Settings.YouTubeMute && isYoutube) {
    muteYouTubeAds();
    removeVideoAds();
  }

  var t = setTimeout(startTime, 1000);
}

startTime();
