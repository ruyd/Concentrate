"use strict";
var Port;
var Model;
var Timer;
var scrollInterval;
const interval = 1000;
const isYoutube = window.location.hostname.indexOf("youtube") > -1;
const log = console.log.bind(window.console);
const element = document.body || document.head || document.documentElement;

// Messaging
function connect() {
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
  const { action, payload } = message;
  switch (action) {
    case "model":
      setModel(payload);
      break;
    case "update":
      updateOptionSettings(payload);
      break;
    default:
      break;
  }
}

chrome.runtime.onMessage.addListener(runtimeMessageHandler);
function runtimeMessageHandler(request, sender, sendResponse) {
  onMessage(request);
}

function updateOptionSettings(payload) {
  Object.assign(Model.State, payload);
  Model.bind();
}

// Composition

function createElement(id, cls) {
  const node = document.createElement("div");
  node.setAttribute("id", id);
  node.setAttribute("class", cls);
  return node;
}

function GetButtonElement(cls) {
  const buttons = document.getElementsByClassName(cls);
  const node = buttons.length > 0 ? buttons[0] : null;
  return node;
}

function GetMuteButton() {
  const node = GetButtonElement("ytp-mute-button");
  return node ? new MuteButton(node) : null;
}

function GetSkipButton() {
  const node = GetButtonElement("ytp-ad-skip-button");
  return node ? new Button(node) : null;
}

function GetPlayButton() {
  const node = GetButtonElement("ytp-play-button");
  return node ? new Button(node) : null;
}

function isMuted(element) {
  //change to class
  //ytp-unmute
  const label = element ? element.getAttribute("title") ?? "" : "";
  return label.toLowerCase().indexOf("unmute") > -1;
}

function makeButton(id, label) {
  const node = createElement(id);
  const btn = new Button(node);
  btn.Label = label;
  return btn;
}

function setModel(payload) {
  const model = new TabModel(payload.Tab, payload.SavedSettings);
  Model = model;
  model.bind();
}
// Objects

function Greyout() {
  const node = createElement("greyout", "concentrate");
  const remaining = createElement("remaining", "concentrate");
  this.Node = node;
  this.Remaining = remaining;
  node.appendChild(remaining);

  this.hide = function () {
    this.Node.style.display = "none";
  };
  this.show = function () {
    this.Node.style.display = "display";
  };

  this.setText = function (s) {
    this.Remaining.innerText = s;
  };
}

function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new TabState(settings);
  this.Greyout = new Greyout();
  this.AudioButton = makeButton("audio", "Sound");
  this.PowerButton = makeButton("power", "Graying");
  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();
  this.IsYoutubeCheck = function () {
    this.Tab && this.Tab.url && this.Tab.url.indexOf("youtube") > 1;
  };
}

class TabState extends Settings {
  constructor(loaded) {
    super(loaded);
    this.DidWeMute = false;
    this.DurationInSeconds = 0;
    this.PreviousDuration = 0;
    this.isFullscreen = false;
    this.isTimerRunning = false;
    this.EnableAutoScroll = false;
    this.AutoScrollSpeed = 1;
  }
}

function Settings(loaded) {
  this.ContentDoubleClick = false;
  this.RemoveAds = false;
  this.RemoveComments = false;
  this.GrayingOn = false;
  this.MutingOn = false;
  this.SkipAds = false;

  if (loaded) {
    Object.assign(this, loaded);
  }
}

function Button(node, label) {
  this.Node = node;
  this.State = false;
  this.Label = label;
  this.set = function () {
    node.setAttribute("class", this.State ? "on" : "off");
    node.setAttribute(
      "title",
      `Switch ${this.Label} ${this.State ? "OFF" : "ON"}`
    );
  };

  this.hide = function () {
    node.style.display = "none";
  };
  this.show = function () {
    node.style.display = "display";
  };

  this.click = function () {
    node.click();
    this.set();
  };
}

function MuteButton(element) {
  this.Node = element;
  this.isMuted = function () {
    isMuted(element);
  };

  this.click = () => this.Node.click();
}

// Prototypes
TabModel.prototype.skip = function () {
  if (!this.SkipButton) return;
  this.SkipButton.click();
  this.reset();
  log("Skip ad!");
};

TabModel.prototype.mute = function () {
  if (!this.MuteButton) return;
  muteButton.click();
  Model.State.DidWeMute = true;
  refresh(true);
  log("muting ad");
};

TabModel.prototype.unmute = function () {
  if (!this.MuteButton || !this.MuteButton.isMuted()) return;
  this.MuteButton.click();
  this.reset();
  log("Content back -> unmuting");
};

TabModel.prototype.inject = function () {
  document.body.appendChild(this.Greyout);
  document.body.appendChild(this.AudioButton);
  document.body.appendChild(this.PowerButton);
};

TabModel.prototype.toggleFullScreen = function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

TabModel.prototype.bind = function () {
  if (this.State.ContentDoubleClick) {
    if (this.DoubleClickBound) return;
    this.DoubleClickBound = true;
    document.documentElement.addEventListener(
      "dblclick",
      this.toggleFullScreen
    );
  } else {
    this.DoubleClickBound = false;
    document.documentElement.removeEventListener(
      "dblclick",
      this.toggleFullScreen
    );
  }

  if (!this.KeyDownBound) {
    document.documentElement.addEventListener("keydown", onKeyDown);
    this.KeyDownBound = true;
  }

  if (isYoutube) {
    this.inject();
  }

  const mute = this.MuteButton;
  if (!mute) return;

  mute.addEventListener("click", (e) => {
    if (this.State.Showing && e.isTrusted) {
      //this.toggleMute();
    }
  });
};

TabModel.prototype.draw = function () {
  const panel = document.getElementById("movie_player");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  const node = this.Greyout.Node;
  node.style.height = rect.height - 0.5 + "px"; //nice yellow strip
  node.style.height = rect.height + "px";
  node.style.width = rect.width + "px";
  node.style.top = rect.top + "px";
  node.style.left = rect.left + "px";
  this.PowerButton.Node.style.left = rect.right - 200 + "px";
  this.AudioButton.Node.style.left = rect.right - 150 + "px";

  const text = this.GetDurationText();
  this.Greyout.setText(text);
};

TabModel.prototype.show = function () {
  this.draw();
  if (this.State.GrayingOn) {
    this.Greyout.show();
  }
  this.PowerButton.show();
  this.AudioButton.show();
};

TabModel.prototype.hide = function () {
  this.Greyout.hide();
  this.PowerButton.hide();
  this.AudioButton.hide();
};

TabModel.prototype.tick = function () {
  this.detect();

  if (!this.State.isTimerRunning) {
    this.State.isTimerRunning = true;
    this.SecondCounter = this.Duration;
  }

  this.SecondsCounter--;
};

TabModel.prototype.reset = function () {
  this.DidWeMute = false;
  this.DurationInSeconds = 0;
};

TabModel.prototype.detect = function () {
  if (!this.State) return;
  this.State.Showing = document.getElementsByClassName("ad-showing").length > 0;

  const durations = document.getElementsByClassName("ytp-time-duration");
  const duration = durations.length > 0 ? durations[0].textContent : null;
  const dsplit = (duration || "").split(":");
  this.State.DurationInSeconds = parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);
  this.draw();

  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();

  this.State.Playing =
    document.getElementsByClassName("paused-mode").length > 0;
  //const label = PlayButton.getAttribute("title") ?? "";
  //this.State.Playing = label.toLowerCase().indexOf("pause") > -1;
};

TabModel.prototype.GetDurationText = function () {
  const duration = this.State.DurationInSeconds;

  if (duration <= 0) return "Zero";

  let minutes = 0;
  let seconds = duration > 0 ? duration : duration * -1;

  if (seconds >= 60) {
    const m = (seconds / 60) << 0;
    minutes += m;
    seconds -= 60 * m;
  }

  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  return `${minutes}:${seconds} / ${duration}`;
};

// Actions

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
  const words = [
    "adserve",
    "ads",
    "_ad",
    "podium",
    "doubleclick",
    "chatan",
    "javascript:window",
    "about:blank",
  ];

  const match = (w, s) => s.indexOf(w) > -1;
  const attrib = (o, s) => o.getAttribute(s) || "xxxxx";

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const id = attrib(frame, "id");
    const name = attrib(frame, "name");
    const src = attrib(frame, "src");
    const hit = words.find(
      (word) => match(word, id) || match(word, name) || match(word, src)
    );
    if (typeof hit == "string") {
      log("removing", frame);
      frame.remove();
    }
  }

  removeClassName("OUTBRAIN");
}

function emptyTagName(name, removeNode) {
  const nodes = document.getElementsByTagName(name);
  for (let node of nodes) {
    if (node.innerHTML.length > 0) node.innerHTML = "";
    if (removeNode) node.remove();
  }
}

function removeClassName(name) {
  const elements = document.getElementsByClassName(name);
  for (let el of elements) {
    el.remove();
    log("class-");
  }
}

function onKeyDown(e) {
  const key = e.code;
  const shiftDown = e.shiftKey;
  const controlDown = e.ctrlKey;
  if (controlDown && key === "Space") {
    Model.State.EnableAutoScroll = !Model.State.EnableAutoScroll;
    e.preventDefault();
    if (!Model.State.EnableAutoScroll) {
      resetScroll();
    }
  }

  if (Model.State.EnableAutoScroll && controlDown) {
    if (key === "ArrowDown") {
      Model.State.AutoScrollSpeed += 1;
      e.preventDefault();
    }
    if (key === "ArrowUp") {
      if (Model.State.AutoScrollSpeed > 1) {
        Model.State.AutoScrollSpeed -= 1;
      } else {
        beep();
      }
      e.preventDefault();
    }

    //toast "AutoScroll Speed: x" + Model.State.AutoScrollSpeed;
  }
}

//append to dom, or remove, security block
function beep() {
  var snd = new Audio(
    "data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU="
  );
  snd.play();
}

function autoScroll() {
  if (Model.State.EnableAutoScroll) {
    if (!scrollInterval) {
      const delay = 0;
      scrollInterval = setInterval(
        () =>
          window.scrollBy({
            top: Model.State.AutoScrollSpeed,
            left: 0,
            behavior: "smooth",
          }),
        delay
      );
    }
  } else {
    resetScroll();
  }
}

function resetScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

// Timer - Refactor

function startTimer() {
  if (Model && Model.hasOwnProperty("State")) {
    if (Model.State.RemoveAds) {
      removeFrameAds();
    }

    autoScroll();

    if (Model.State.YouTubeMute && isYoutube) {
      Model.tick();
      muteYouTubeAds();
      removeVideoAds();
    }

    if (Model.State.RemoveComments && isYoutube) {
      emptyTagName("ytd-comments");
    }
  }

  Timer = setTimeout(startTimer, interval);
}

/// INITIALIZATION
connect();
startTimer();
