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

function muteYouTubeAds() {
  if (Model.SkipButton && Model.State.SkipOn) {
    Model.skip();
    return;
  }

  if (!Model.State.Showing) {
    if (Model.State.DidWeMute) {
      Model.unmute();
    }
    Model.hide();
  }

  if (Model.State.Showing) {
    Model.show();
    if (Model.State.MutingOn && !Model.State.Muted) {
      Model.mute();
    }
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

function startTimer() {
  if (Model && Model.hasOwnProperty("State")) {
    if (Model.State.FrameAds) {
      removeFrameAds();
    }

    if (Model.State.YouTubeMute && isYoutube) {
      muteYouTubeAds();
      removeVideoAds();
    }
    Model.tick();
  }

  Timer = setTimeout(startTimer, interval);
}

///
connect();
startTimer();
