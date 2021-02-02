import "./common";

var Settings = {};

const power_button = new Button("power");
const audio_button = new Button("audio");
const greyout = Greyout();

function appendIfNeeded() {
  if (!isYoutube) return;

  document.body.appendChild(greyout);
  document.body.appendChild(audio_button);
  document.body.appendChild(power_button);
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

function bind(tabId) {
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

//Messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.Refresh && request.Settings) {
    Settings = request.Settings;

    if (Settings.ContentDoubleClick) bind();
    else unbind();
  }
});

//YouTube Noise Removals
var muteButton = getMuteButton();
const initialMute = isMuted();

if (muteButton) {
  muteButton.addEventListener(
    "click",
    (e) => {
      const showing = document.getElementsByClassName("ad-showing").length > 0;
      if (showing) {
        //Simulated = false
        if (e.isTrusted) {
          Context.MutingOn = !Context.MutingOn;
          audio_button.setAttribute("class", Context.MutingOn ? "on" : "off");
        }
      }
    },
    false
  );
}

if (greyout) {
  greyout.onclick = () => {
    Context.GrayingOn = !Context.GrayingOn;
    power_button.setAttribute("class", Context.GrayingOn ? "on" : "off");
    greyout.style.display = Context.GrayingOn ? "display" : "none";

    if (isMuted()) {
      audio_button.click();
    }
  };
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

  //greyout.style.height = rect.height - 0.5 + "px"; //nice yellow strip
  greyout.style.height = rect.height + "px";
  greyout.style.width = rect.width + "px";
  greyout.style.top = rect.top + "px";
  greyout.style.left = rect.left + "px";

  power_button.style.left = rect.right - 200 + "px";
  audio_button.style.left = rect.right - 150 + "px";
}

function reset_variables() {
  Context.DidWeMute = false;
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

function show() {
  resize();
  if (Context.GrayingOn) {
    greyout.show();
  }
  power_button.show();
  audio_button.show();
}

function hide() {
  greyout.hide();
  power_button.hide();
  audio_button.hide();
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

    hide();
  }

  if (showing) {
    show();

    const muted = isMuted();
    if (Context.MutingOn && !muted) {
      log("muting ad");
      if (muteButton) {
        muteButton.click();
        Context.DidWeMute = true;
      }
      refresh(true);
      return;
    }

    refresh();
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

  const durations = document.getElementsByClassName("ytp-time-duration");
  const duration = durations.length > 0 ? durations[0].textContent : null;
  const dsplit = (duration || "").split(":");
  const duration_seconds = parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);

  if (starting || duration !== last_duration) {
    current_seconds_counter = duration_seconds;
  } else {
    current_seconds_counter--;
  }

  last_duration = duration;
  if (current_seconds_counter < 0) {
    log("negative reset");
    current_seconds_counter = duration_seconds;
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
    const adish = id ? id.indexOf("ads") > -1 : false;
    const src = frame.getAttribute("src") || "";
    const srcadish =
      src === "" ||
      src.indexOf("adserve") > -1 ||
      src.indexOf("ads") > -1 ||
      src.indexOf("_ad") > -1 ||
      src.indexOf("podium") > -1 ||
      src.indexOf("doubleclick") > -1 ||
      src.indexOf("chatan") > -1 ||
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

/////
startTime();
bind();
appendIfNeeded();
