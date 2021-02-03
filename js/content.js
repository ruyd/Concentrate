var Model;
var Port;
var Timer;

const interval = 1000;
const isYoutube = window.location.hostname.indexOf("youtube") > -1;
const log = console.log.bind(window.console);

//Messaging
function connect() {
  log("connecting");
  Port = chrome.runtime.connect({
    name: "content",
  });

  Port.onMessage.addListener(onMessage);

  Port.onDisconnect.addListener(function () {
    if (Port) {
      Port.Closed = true;
    }
  });

  Port.postMessage({
    type: "connected",
  });
}

function onMessage(message) {
  log("::", message);
  const action = message && message.type;
  switch (action) {
    case "ping":
      Port.postMessage({ type: "pong" });
      break;
    case "model":
      setModel(message.payload);
      break;
    default:
      break;
  }
}

function setModel(model) {
  Model = model;
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
  if (!panel || !Model.Greyout) return;

  const rect = panel.getBoundingClientRect();

  //Model.Greyout.style.height = rect.height - 0.5 + "px"; //nice yellow strip
  Model.Greyout.style.height = rect.height + "px";
  Model.Greyout.style.width = rect.width + "px";
  Model.Greyout.style.top = rect.top + "px";
  Model.Greyout.style.left = rect.left + "px";

  power_button.style.left = rect.right - 200 + "px";
  audio_button.style.left = rect.right - 150 + "px";
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
  if (Model.State.GrayingOn) {
    Model.Greyout.show();
  }
  Model.PowerButton.show();
  Model.AudioButton.show();
}

function hide() {
  Model.Greyout.hide();
  Model.PowerButton.hide();
  Model.AudioButton.hide();
}

function muteYouTubeAds() {
  if (Model.SkipButton && Model.State.SkipOn) {
    log("Skip ad!");
    Model.skip();
    return;
  }

  if (!Model.State.Showing) {
    if (Model.State.DidWeMute) {
      log("Content back -> unmuting");
      Model.unmute();
    }

    hide();
  }

  if (Model.State.Showing) {
    show();
    if (Model.State.MutingOn && !Model.State.Muted) {
      log("muting ad");
      Model.mute();
      return;
    }

    refresh();
  }
}

function refresh(starting = false) {
  Model.detect();
  if (!Model.State.Model.State.Showing) {
    return;
  }

  if (!isPlaying()) {
    remaining.innerText = "Paused";
    return;
  }

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

  if (Model.State.Showing && remaining && duration) {
    remaining.innerText = `${minutes}:${seconds} / ${duration}`;
  } else {
    log("blank");
    remaining.innerText = "";
  }
}

function updateState() {}

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

function startTimer() {
  if (Model && Model.hasOwnProperty("State")) {
    if (Model.State.FrameAds) {
      removeFrameAds();
    }

    if (Model.State.YouTubeMute && isYoutube) {
      muteYouTubeAds();
      removeVideoAds();
    }
  }

  Timer = setTimeout(startTimer, interval);
}

///
connect();
startTimer();
