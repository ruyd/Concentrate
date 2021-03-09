"use strict";
var Port;
var Timer;
var Model = new ConcentrateModel();
var IntervalId = -1;

const log = false ? console.log.bind(window.console) : function () {};
const interval = 1000;
const nevermatch = "x0x0x";
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
  "phoenix-widget",
  "phoenix",
];
const removals_classNames = [
  "OUTBRAIN",
  "mgbox",
  "IL_BASE",
  "ads[mail.google.com]",
  "ad[mail.google.com]",
  "contentText",
  "ad-footer",
  "ad-support-desktop",
];
const removals_commentTags = [];
const removals_videoAdWords = [
  "video-ads",
  "ytd-player-legacy-desktop-watch-ads-renderer",
  "ytd-watch-next-secondary-results-renderer sparkles-light-cta",
];

const removals = [
  ...removals_bannerAdWords,
  ...removals_classNames,
  ...removals_videoAdWords,
];
const playerTypes = {
  YouTube: {
    player: "html5-video-player",
    button: "ytp-mute-button",
    isMuted: function (node) {
      const title = node?.getAttribute("title") || "";
      return title.toLowerCase().indexOf("unmute") > -1;
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
// Listeners
chrome.runtime.onMessage.addListener(runtimeMessageHandler);
function runtimeMessageHandler(request, sender, sendResponse) {
  onMessageHandler(request);
}

// Messaging
function connect() {
  Port = chrome.runtime.connect({
    name: "content",
  });

  Port.onMessage.addListener(onMessageHandler);

  Port.onDisconnect.addListener(function () {
    log("Disconnected -> Dev Only -> Reloading");
    window.location.reload();
  });

  Port.postMessage({
    action: "content.connected",
  });
}

function stateToBackground(action = "content.state") {
  Port.postMessage({
    action,
    payload: Model.State,
    scope: "tab",
  });
}

const receivers = [
  {
    catch: ["background.state", "options.update", "popup.update"],
    fn: updateState,
  },
  {
    catch: ["model"],
    fn: setModel,
  },
];
function onMessageHandler(message, sender) {
  log(message, sender);
  const { action, payload } = message;
  const receiver = receivers.find((r) => r.catch.includes(action));
  receiver.fn(payload);
}

// Composition

function createElement(id, cls) {
  const node = document.createElement("div");
  node.setAttribute("id", id);
  if (cls) node.setAttribute("class", cls);
  return node;
}

function GetElement(cls) {
  const nodes = document.getElementsByClassName(cls);
  const node = nodes.length > 0 ? nodes[0] : null;
  return node;
}

function GetTextContent(cls) {
  const nodes = document.getElementsByClassName(cls);
  const result = nodes.length > 0 ? nodes[0].textContent : null;
  return result;
}

function GetPlayerProgress() {
  //const el = GetElement("ytp-progress-bar");
  // el?.getAttribute("aria-valuenow");
  return GetTextContent("ytp-time-current");
}

function GetMuteButton(type) {
  if (!type) return null;
  const node = GetElement(type.button);
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
  const node = GetElement("ytp-ad-skip-button");
  return node ? new Button(node) : null;
}

function GetPlayButton() {
  const node = GetElement("ytp-play-button");
  return node ? new Button(node) : null;
}

function CreateButton(id, label, action) {
  const node = createElement(id);
  const btn = new Button(node, label, action);
  return btn;
}

function setModel(payload) {
  const model = new ConcentrateModel(payload.Tab, payload.State);
  Model = model;
  model.bind();
  model.AudioButton.set(model.State.MutingOn);
  model.PowerButton.set(model.State.GrayingOn);
}

function updateState(payload) {
  Object.assign(Model.State, payload);
  Model.bind();
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
    node.style.display = "flex";
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

function ContentState(loaded) {
  this.DidWeMute = false;
  this.DurationInSeconds = 0;
  this.PreviousDuration = 0;
  this.isFullscreen = false;
  this.SecondCounter = 0;

  if (loaded) {
    Object.assign(this, loaded);
  }

  this.PlayerType = GetUrlPlayerType();
}

function ConcentrateModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = settings ? new ContentState(settings) : {};
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

ConcentrateModel.prototype.skip = function () {
  if (!this.SkipButton) return;
  this.SkipButton.click();
  this.reset();
  log("Skipped ad!");
};

ConcentrateModel.prototype.mute = function () {
  if (!this.MuteButton || this.MuteButton.isMuted()) {
    return;
  }
  this.MuteButton.click();
  this.State.DidWeMute = true;
  log("Muted ad");
};

ConcentrateModel.prototype.unmute = function () {
  if (!this.MuteButton || !this.MuteButton.isMuted()) {
    return;
  }
  this.MuteButton.click();
  this.State.DidWeMute = false;
  log("Content's back -> unmuting");
};

ConcentrateModel.prototype.toggleFullScreen = function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

ConcentrateModel.prototype.bind = function () {
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

ConcentrateModel.prototype.draw = function () {
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

ConcentrateModel.prototype.show = function () {
  if (this.State.GrayingOn) {
    this.Greyout.show();
  }
  this.PowerButton.show();
  this.AudioButton.show();
};

ConcentrateModel.prototype.hide = function () {
  this.Greyout.hide();
  this.PowerButton.hide();
  this.AudioButton.hide();
};

ConcentrateModel.prototype.tick = function () {
  if (!this.State.Showing) return;

  if (this.State.SecondCounter >= this.State.DurationInSeconds) {
    this.State.SecondCounter = 0;
  }
  if (!this.State.Paused) this.State.SecondCounter++;

  this.draw();
};

ConcentrateModel.prototype.reset = function () {
  this.State.SecondCounter = this.State.ProgressInSeconds || 0;
};

// Multiple Support?
ConcentrateModel.prototype.detect = function () {
  if (!this.State) return;

  const showing = document.getElementsByClassName("ad-showing").length > 0;
  if (showing && !this.State.Showing) {
    this.reset();
  }

  this.State.Showing = showing;

  this.State.TimeDuration = GetTextContent("ytp-time-duration");
  if (this.State.TimeDuration) {
    const dsplit = this.State.TimeDuration.split(":");
    this.State.DurationInSeconds =
      parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);
  }
  this.State.ProgressInSeconds = GetPlayerProgress();
  this.State.HasVideo = hasVideoPlayers();
  this.State.PlayerType = GetUrlPlayerType();
  this.MuteButton = GetMuteButton(this.State.PlayerType);
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();

  this.State.Paused = document.getElementsByClassName("paused-mode").length > 0;
};

ConcentrateModel.prototype.GetDurationText = function () {
  if (this.State.Paused) return "...";
  let minutes = 0;
  let seconds = this.State.SecondCounter;

  if (seconds >= 60) {
    minutes = Math.floor(seconds / 60);
    seconds -= 60 * minutes;
  }

  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  return `${minutes}:${seconds} / ${this.State.TimeDuration}`;
};

ConcentrateModel.prototype.IsReady = function () {
  return this.hasOwnProperty("State") && this.Tab;
};

ConcentrateModel.prototype.inject = function () {
  if (!document.body || !Model.IsReady()) return false;
  if (Model.injected) return false;
  document.body.appendChild(Model.Greyout.Node);
  document.body.appendChild(Model.AudioButton.Node);
  document.body.appendChild(Model.PowerButton.Node);
  Model.injected = true;
  return true;
};

// Actions
const Suspects = new Set();
const indexof = (w, s) => s.indexOf(w) > -1;
const attrib = (o, s) => o.getAttribute(s) || nevermatch;
function preparse() {
  const hostname = Model.State?.Hostname ?? nevermatch;
  Suspects.clear();
  document
    .querySelectorAll("div[id],div[class],iframe,td[class]")
    .forEach((node) => {
      let direct = Array.from(node.classList).find((c) =>
        removals_classNames.includes(c)
      );
      if (direct) {
        addsuspect(node);
      } else if (node.tagName === "IFRAME") {
        checkForSuspect(node, hostname, ["src", "name"]);
      } else {
        checkForSuspect(node, hostname);
      }
    });
}

function addsuspect(node) {
  Suspects.add(node);
}

//rework sig, primitives
function checkForSuspect(node, hostname, attribArray = []) {
  const attribValues = [];
  attribArray.forEach((a) =>
    attribValues.push(node.getAttribute(a) ?? nevermatch)
  );
  if (
    checkTextsForSuspect(
      [node.id, ...node.classList, ...attribValues],
      hostname
    )
  ) {
    addsuspect(node);
    return true;
  }
  return false;
}

function checkTextsForSuspect(textsArray, hostname) {
  for (const word of removals) {
    if (word.indexOf(hostname) == -1) {
      const cleaned = checkWordException(word, hostname);
      const match = textsArray.find((text) =>
        cleaned.word.length > 2
          ? text.indexOf(cleaned.word) > -1
          : text === cleaned.word
      );
      if (match) return true;
    }
  }

  return false;
}

//why not extend words hmm...
function checkWordException(word, hostname) {
  const result = {
    word,
    isException: false,
  };
  if (word.indexOf("[") > -1) {
    result.word = word.substring(0, word.indexOf("["));
    result.isException = word.indexOf(hostname) > -1;
  }
  return result;
}

function removeSuspects() {
  if (!Model.State.RemoveAds) return false;

  for (const node of Suspects) {
    log("removing", node);
    node.remove();
  }

  return true;
}

// PTSD
function muteCnnBang() {
  if (Model.State.PlayerType != playerTypes.CNN) return false;

  if (Model.State.MutingOn) {
    if (Model.MuteButton && !Model.MuteButton.isMuted()) {
      if (Model.State.DidWeMute) return false; // User unmuted
      Model.mute();
    }
  }

  return true;
}

// What happens with embeds?
function muteYouTubeAds() {
  if (Model.State.PlayerType != playerTypes.YouTube) {
    return false;
  }

  if (Model.SkipButton && Model.State.SkipAds) {
    Model.skip();
    return true;
  }

  if (Model.State.Showing) {
    if (Model.State.MutingOn) {
      if (!Model.State.DidWeMute || !Model.State.PlayerType.isMuted()) {
        Model.mute();
      }
    } else {
      // Turned off
      if (Model.State.DidWeMute && Model.State.PlayerType.isMuted()) {
        Model.unmute();
      }
    }

    // Turned off
    if (Model.State.GrayingOn) {
      Model.show();
    } else {
      Model.Greyout.hide();
    }
  } else {
    // Ad Finished
    if (Model.State.DidWeMute) {
      Model.unmute();
    }
    Model.hide();
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

function toggleMuting() {
  const turningOff = Model.State.MutingOn;
  Model.State.MutingOn = !Model.State.MutingOn;
  Model.AudioButton.set(Model.State.MutingOn);
  if (turningOff) {
    Model.unmute();
  } else {
    Model.mute();
  }
  stateToBackground();
}
function toggleGraying() {
  Model.State.GrayingOn = !Model.State.GrayingOn;
  Model.PowerButton.set(Model.State.GrayingOn);
  Model.Greyout.set(Model.State.GrayingOn);
  stateToBackground();
}

// AutoScroll
function autoScroll() {
  log("autoScroll");
  if (Model.State.EnableAutoScroll) {
    if (IntervalId < 0) {
      const delay = 50;
      clearInterval(IntervalId);
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

function updateScrollSpeed(speed) {
  Model.State.AutoScrollSpeed += speed;
  stateToBackground();
}

function onKey(e) {
  const key = e.code;
  const controlDown = e.ctrlKey;

  if (controlDown && key === "Space") {
    e.preventDefault();
    Model.State.EnableAutoScroll = !Model.State.EnableAutoScroll;
    autoScroll();
    stateToBackground();
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

function addtask(task) {
  Model.Tasks.add(task);
}

var executing = false;
async function executeParallel(tasks) {
  if (tasks.size === 0) return;
  if (executing) return;
  //why does it only work like this, closure? block scope? sandboxed windows hmmm
  const wrapped = Array.from(tasks).map(
    (task) => new Promise((resolve) => resolve(task()))
  );
  executing = true;
  const results = await Promise.all(wrapped);
  executing = false;
}

// Timer
function startTimer() {
  if (Model.IsReady()) {
    if (Model.Tasks.size === 0) {
      addtask(muteYouTubeAds);
      addtask(preparse);
      addtask(removeSuspects);
      addtask(removeComments);
      addtask(muteCnnBang);
    }

    Model.detect();
    Model.inject();
    executeParallel(Model.Tasks);
    Model.tick();
  }

  Timer = setTimeout(startTimer, interval);
}

/// init
connect();
startTimer();
