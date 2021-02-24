"use strict";
var Port;
var Timer;
var Model = new TabModel();
var IntervalId = -1;

const interval = 1000;
const isYouTube = window.location.hostname.indexOf("youtube") > -1;
const log = console.log.bind(window.console);
const removals_bannerAdWords = [
  "adserve",
  "ads",
  "_ad",
  "podium",
  "doubleclick",
  "chatan",
  "javascript:window",
  "about:blank",
  "tree.com",
];

const removals_classNames = [
  "OUTBRAIN",
  "mgbox",
  "IL_BASE",
  "ads[mail.google.com]",
  "ad",
  "contentText",
];
const removals_commentTags = [];
const removals_videoAdWords = [
  "video-ads",
  "ytd-player-legacy-desktop-watch-ads-renderer",
  "ytd-watch-next-secondary-results-renderer sparkles-light-cta",
];

const playerTypes = {
  YouTube: {
    player: "html5-video-player",
    button: "ytp-mute-button",
    isMuted: function (node) {
      return (
        (node ? node.getAttribute("title") : "")
          .toLowerCase()
          .indexOf("unmute") > -1
      );
    },
  },
  CNN: {
    match: "cnn.com",
    player: "pui-wrapper",
    button: "pui_volume-controls_mute-toggle",
    isMuted: function (node) {
      if (document.getElementById("sound-mute-icon")) return true;
      else return false;
    },
  },
};

const hasVideoPlayers = () => {
  for (const key in playerTypes) {
    if (document.getElementsByClassName(playerTypes[key].player)) return true;
  }
  return false;
};

// Messaging
function connect(message) {
  Port = chrome.runtime.connect({
    name: "content",
  });

  Port.onMessage.addListener(onMessageHandler);

  Port.onDisconnect.addListener(function () {
    if (Port) {
      Port = null;
    }
  });

  Port.postMessage(
    message || {
      action: "connected",
    }
  );
}

function stateToBackground(action) {
  const message = {
    action,
    payload: Model.State,
  };
  if (Port) Port.postMessage(message);
  else connect(message);
}

function onMessageHandler(message, sender) {
  log(message, sender);
  const { action, payload } = message;
  switch (action) {
    case "model":
      setModel(payload);
      break;
    case "update":
      updateState(payload);
      break;
    case "scroll.speed":
      updateScrollSpeed(payload);
      break;
    default:
      break;
  }
}

chrome.runtime.onMessage.addListener(runtimeMessageHandler);
function runtimeMessageHandler(request, sender, sendResponse) {
  onMessageHandler(request);
}

function updateState(payload) {
  Object.assign(Model.State, payload);
  Model.bind();
}

// Composition

function createElement(id, cls) {
  const node = document.createElement("div");
  node.setAttribute("id", id);
  if (cls) node.setAttribute("class", cls);
  return node;
}

function GetButtonElement(cls) {
  const buttons = document.getElementsByClassName(cls);
  const node = buttons.length > 0 ? buttons[0] : null;
  return node;
}

function GetTextContent(cls) {
  const nodes = document.getElementsByClassName(cls);
  const result = nodes.length > 0 ? nodes[0].textContent : null;
  return result;
}

function GetMuteButton(type) {
  if (!type) return null;
  const node = GetButtonElement(type.button);
  return node ? new MuteButton(node, type) : null;
}

// Future[]?
function GetUrlPlayerType() {
  let result = playerTypes.YouTube;
  const url = getUrl();
  if (url && url.indexOf(playerTypes.CNN.match) > -1) {
    result = playerTypes.CNN;
  }
  return result;
}

function GetSkipButton() {
  const node = GetButtonElement("ytp-ad-skip-button");
  return node ? new Button(node) : null;
}

function GetPlayButton() {
  const node = GetButtonElement("ytp-play-button");
  return node ? new Button(node) : null;
}

function CreateButton(id, label, action) {
  const node = createElement(id);
  const btn = new Button(node, label, action);
  return btn;
}

function setModel(payload) {
  const model = new TabModel(
    payload.Tab,
    payload.SavedState || payload.SavedSettings
  );
  Model = model;
  model.bind();
  model.AudioButton.set(model.State.MutingOn);
  model.PowerButton.set(model.State.GrayingOn);
}
// Objects

function Greyout(action) {
  const node = createElement("greyout", "concentrate");
  const remaining = createElement("remaining", "remaining");
  this.Node = node;
  this.Remaining = remaining;
  node.appendChild(remaining);

  this.hide = function () {
    node.style.display = "none";
  };
  this.show = function () {
    node.style.display = "block";
  };

  this.set = function (state) {
    if (state) this.show();
    else this.hide();
  };

  this.setText = function (s) {
    remaining.innerText = s;
  };

  node.onclick = function () {
    node.style.display = "none";
    action();
  };
}

class TabState extends Settings {
  constructor(loaded) {
    super(loaded);
    this.DidWeMute = false;
    this.DurationInSeconds = 0;
    this.PreviousDuration = 0;
    this.isFullscreen = false;
    this.isCounterRunning = false;
    this.SecondCounter = 0;
    this.EnableAutoScroll = false;
    this.AutoScrollSpeed = 5;
    this.PlayerType = GetUrlPlayerType();
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
function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = settings ? new TabState(settings) : {};
  this.Greyout = new Greyout(toggleGraying);
  this.AudioButton = CreateButton("audio", "Sound", toggleMuting);
  this.PowerButton = CreateButton("power", "Graying", toggleGraying);
  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();
  this.Tasks = new Set();
}

function Button(node, label, action) {
  const me = this;
  this.Node = node;
  this.State = false;
  this.Label = label;
  this.toggle = function () {
    me.State = !me.State;
    me.draw();
  };

  this.set = function (state) {
    me.State = state;
    me.draw();
  };

  this.draw = function () {
    if (node.className && node.className.indexOf("ytp") > -1) return;
    node.classList.toggle("on", me.State);
    node.classList.toggle("off", !me.State);
    node.setAttribute("title", `Switch ${me.Label} ${me.State ? "OFF" : "ON"}`);
  };

  this.hide = function () {
    node.style.display = "none";
  };
  this.show = function () {
    node.style.display = "block";
  };

  node.onclick = function () {
    me.toggle();
    if (action) action();
  };

  this.click = () => node.click();

  //init
  me.draw();
}

function MuteButton(node, type) {
  this.Node = node;
  this.isMuted = () => type.isMuted(node);
  this.click = () => node.click();
}

// Prototypes

TabModel.prototype.skip = function () {
  if (!this.SkipButton) return;
  this.SkipButton.click();
  this.reset();
  log("Skipped ad!");
};

TabModel.prototype.mute = function () {
  if (!this.MuteButton || this.MuteButton.isMuted()) {
    return;
  }
  this.MuteButton.click();
  this.State.DidWeMute = true;
  log("Muted ad");
};

TabModel.prototype.unmute = function () {
  if (!this.MuteButton || !this.MuteButton.isMuted()) {
    return;
  }
  this.MuteButton.click();
  this.State.DidWeMute = false;
  log("Content's back -> unmuting");
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
  autoScroll();

  if (this.State.ContentDoubleClick) {
    if (!this.DoubleClickBound) {
      this.DoubleClickBound = true;
      document.documentElement.addEventListener(
        "dblclick",
        this.toggleFullScreen
      );
    }
  } else {
    this.DoubleClickBound = false;
    document.documentElement.removeEventListener(
      "dblclick",
      this.toggleFullScreen
    );
  }

  if (!this.KeyBound) {
    document.documentElement.addEventListener("keydown", onKey);
    this.KeyBound = true;
  }

  const mute = this.MuteButton;
  if (!mute || !mute.Node || this.MuteBound) return;
  mute.Node.addEventListener("click", (e) => {
    if (this.State.Showing && e.isTrusted) {
      //this.toggleMute();
      //hmm
    }
  });
  this.MuteBound = true;
};

TabModel.prototype.draw = function () {
  const panel = document.getElementById("movie_player");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  const node = this.Greyout.Node;
  node.style.height = rect.height + "px";
  node.style.width = rect.width + "px";
  node.style.top = rect.top + "px";
  node.style.left = rect.left + "px";

  this.PowerButton.Node.style.top = rect.top + 50 + "px";
  this.PowerButton.Node.style.left = rect.right - 150 + "px";

  this.AudioButton.Node.style.top = rect.top + 50 + "px";
  this.AudioButton.Node.style.left = rect.right - 100 + "px";

  const text = this.GetDurationText();
  this.Greyout.setText(text);
};

TabModel.prototype.show = function () {
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
  if (!this.State.Showing) return;

  this.draw();

  if (!this.State.isCounterRunning) {
    this.State.isCounterRunning = true;
    this.State.SecondCounter = this.State.DurationInSeconds;
  }

  this.State.SecondCounter--;

  if (this.State.SecondCounter < 1) {
    this.reset();
  }
};

TabModel.prototype.reset = function () {
  this.State.SecondCounter = 0;
  this.State.isCounterRunning = false;
};

TabModel.prototype.detect = function () {
  if (!this.State) return;
  this.State.Showing = document.getElementsByClassName("ad-showing").length > 0;

  this.State.TimeDuration = GetTextContent("ytp-time-duration");
  if (this.State.TimeDuration) {
    const dsplit = this.State.TimeDuration.split(":");
    this.State.DurationInSeconds =
      parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);
  }

  this.State.HasVideo = hasVideoPlayers();
  this.State.PlayerType = GetUrlPlayerType();
  this.MuteButton = GetMuteButton(this.State.PlayerType);
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();

  this.State.Playing =
    document.getElementsByClassName("paused-mode").length > 0;
};

TabModel.prototype.GetDurationText = function () {
  const duration = this.State.SecondCounter;

  if (duration <= 0) return "...";

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

  return `${minutes}:${seconds} / ${this.State.TimeDuration}`;
};

TabModel.prototype.IsReady = function () {
  return this.hasOwnProperty("State") && this.Tab;
};

// Actions
function removeVideoAds() {
  if (!Model.State.HasVideo) return false;
  for (const name of removals_videoAdWords) {
    removeClassName(name);
  }
  return true;
}

// Public Service
function muteCnnBang() {
  if (Model.State.PlayerType != playerTypes.CNN) return false;

  if (Model.MuteButton && !Model.MuteButton.isMuted()) {
    if (Model.State.DidWeMute) return false; // User unmuted
    Model.mute();
  }
  return true;
}

// What happens with embeds?
function muteYouTubeAds() {
  if (!Model.State.HasVideo) return false;
  if (Model.State.PlayerType != playerTypes.YouTube) return false;

  if (Model.SkipButton && Model.State.SkipAds) {
    Model.skip();
    return true;
  }

  if (Model.State.Showing) {
    if (Model.State.MutingOn && !Model.State.DidWeMute) {
      Model.mute();
    }
    if (Model.State.GrayingOn) {
      Model.show();
    } else {
      Model.Greyout.hide();
    }
  } else {
    if (Model.State.DidWeMute) {
      Model.unmute();
    }
    Model.hide();
  }

  return true;
}

function removeFrameAds() {
  if (!Model.State.RemoveAds) return false;

  const frames = document.getElementsByTagName("IFRAME");
  const match = (w, s) => s.indexOf(w) > -1;
  const attrib = (o, s) => o.getAttribute(s) || "xxxxx";

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const id = attrib(frame, "id");
    const name = attrib(frame, "name");
    const src = attrib(frame, "src");
    const hit = removals_bannerAdWords.find(
      (word) => match(word, id) || match(word, name) || match(word, src)
    );
    if (typeof hit == "string") {
      log("removing", frame);
      frame.remove();
    }
  }

  return true;
}

function removeClassAds() {
  if (!Model.State.RemoveAds) return false;
  for (const cname of removals_classNames) {
    const start = cname.indexOf("[") + 1;
    const except = cname.substring(start).replace("]", "").split(",");
    const url = getUrl();
    if (except && except.find((hostname) => url.indexOf(hostname) > -1)) {
      continue;
    }
    removeClassName(cname);
  }
  return true;
}

function removeComments() {
  if (!Model.State.RemoveComments) return false;
  emptyTagName("ytd-comments");
  removeNode("disqus_thread");

  for (const word in removals_commentTags) {
    emptyTagName(word, true);
    removeNode(word);
  }

  return true;
}

function inject() {
  if (!document.body || !Model.IsReady() || !Model.State.HasVideo) return false;
  document.body.appendChild(Model.Greyout.Node);
  document.body.appendChild(Model.AudioButton.Node);
  document.body.appendChild(Model.PowerButton.Node);
  return true;
}

function save() {
  //log("save", Model);
}

function toggleMuting() {
  const turningOff = Model.State.MutingOn;
  Model.State.MutingOn = !Model.State.MutingOn;
  Model.AudioButton.set(Model.State.MutingOn);
  if (turningOff) {
    Model.unmute();
  } else {
    Model.mute();
  }
  save();
}
function toggleGraying() {
  Model.State.GrayingOn = !Model.State.GrayingOn;
  Model.PowerButton.set(Model.State.GrayingOn);
  Model.Greyout.set(Model.State.GrayingOn);
  save();
}

// AutoScroll
function autoScroll() {
  if (Model.State.EnableAutoScroll) {
    if (IntervalId < 0) {
      clearInterval(IntervalId);
      const delay = 50;
      if (Model.State.AutoScrollSpeed === 0) Model.State.AutoScrollSpeed = 1;
      IntervalId = setInterval(
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
    stopScroll();
  }
}

function stopScroll() {
  clearInterval(IntervalId);
  IntervalId = -1;
}

function onKey(e) {
  const key = e.code;
  const controlDown = e.ctrlKey;

  if (controlDown && key === "Space") {
    e.preventDefault();
    Model.State.EnableAutoScroll = !Model.State.EnableAutoScroll;
    autoScroll();
    stateToBackground("scroll.set");
  }

  if (Model.State.EnableAutoScroll && controlDown) {
    if (key === "ArrowDown") {
      e.preventDefault();
      updateScrollSpeed(1);
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      updateScrollSpeed(-1);
    }
  }
}

function updateScrollSpeed(speed) {
  Model.State.AutoScrollSpeed += speed;
  stateToBackground("scroll.set");
}

// Utils
function emptyTagName(name, removeNode) {
  const nodes = document.getElementsByTagName(name);
  for (const node of nodes) {
    if (node.innerHTML.length > 0) node.innerHTML = "";
    if (removeNode) node.remove();
  }
}

function removeClassName(name) {
  const elements = document.getElementsByClassName(name);
  for (const el of elements) {
    el.remove();
  }
}

function removeNode(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove();
  }
}

function beep() {
  const snd = new Audio(
    "data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU="
  );
  snd.play();
}

function getUrl() {
  if (!Model.IsReady()) return null;
  return Model.Tab.pendingUrl ? Model.Tab.pendingUrl : Model.Tab.url;
}

// Timer
function startTimer() {
  if (Model.IsReady()) {
    if (Model.Tasks.size === 0) {
      Model.Tasks.add(muteYouTubeAds);
      Model.Tasks.add(removeFrameAds);
      Model.Tasks.add(removeClassAds);
      Model.Tasks.add(removeVideoAds);
      Model.Tasks.add(removeComments);
      Model.Tasks.add(muteCnnBang);
    }

    if (document.readyState === "complete" && !Model.injected) {
      Model.injected = inject();
    }

    Model.detect();
    executeParallel(Model.Tasks);
    Model.tick();
  }

  Timer = setTimeout(startTimer, interval);
}

var executing = false;
async function executeParallel(tasks) {
  if (tasks.size === 0) return;
  if (executing) return;
  const wrapped = Array.from(tasks).map(
    (task) => new Promise((resolve) => resolve(task()))
  );
  executing = true;
  const results = await Promise.all(wrapped);
  executing = false;
}

/// init
connect();
startTimer();
