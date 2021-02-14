"use strict";
import "./common.js";
var Model;
var Timer;
const interval = 1000;
const isYoutube = window.location.hostname.indexOf("youtube") > -1;

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
    if (Model.tick) {
      log("tick found!");
    } else {
      log("tick not found");
    }
  }

  Timer = setTimeout(startTimer, interval);
}

function onMessageEvent(event) {
  log("onEvent", event);
  const action = event.type;
  switch (action) {
    case "ping":
      break;
    case "model":
      setModel(event.payload);
      break;
    default:
      break;
  }
}

///
var l = window.addEventListener("concentrateEvent", onMessageEvent, true);
startTimer();
console.log("content_module.js", l);
