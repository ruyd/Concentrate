"use strict";
//webpack?
var Port;
var Model;
var Timer;
const interval = 1000;
const isYoutube = window.location.hostname.indexOf("youtube") > -1;
const log = console.log.bind(window.console);
const element = document.body || document.head || document.documentElement;
const resources = [];

// Worker
function resource(filename) {
  let script = document.createElement("script");
  script.type = "module";
  script.src = chrome.extension.getURL(filename);
  return script;
}

for (let i = 0; i < resources.length; i++) {
  let filename = resources[i];
  let script = resource(filename);

  if (!element.querySelector("script[src*='" + filename + "']")) {
    element.appendChild(script);
  }
}

// Messaging
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
  log("onMessage", message);
  const { action, payload } = message;
  switch (action) {
    case "model":
      setModel(payload);
      break;
    default:
      break;
  }
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
  log(model);
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
  this.SoundButton = makeButton("audio", "Sound");
  this.PowerButton = makeButton("power", "Graying");
  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();
  this.IsYoutube = function () {
    this.Tab && this.Tab.url && this.Tab.url.indexOf("youtube") > 1;
  };
}

class TabState extends Settings {
  constructor() {
    super();
    this.DidWeMute = false;
    this.DurationInSeconds = 0;
    this.PreviousDuration = 0;
    this.isFullscreen = false;
    this.isTimerRunning = false;
  }
}

function Settings(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.RemoveAds = true;
  this.RemoveComments = true;
  this.YouTubeMute = true;
  this.ShowClock = true;
  this.GrayingOn = true;
  this.MutingOn = true;
  this.SkipAds = true;
  this.LabelWindowNewTabs = true;

  if (loaded) {
    Object.assign(loaded, this);
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
  if (this.Model.State.ContentDoubleClick) {
    document.documentElement.addEventListener("dblclick", toggleFullScreen);
  } else {
    document.documentElement.removeEventListener("dblclick", toggleFullScreen);
  }

  const mute = this.MuteButton;
  if (!mute) return;

  mute.addEventListener("click", (e) => {
    if (Model.State.Showing && e.isTrusted) {
      //Model.toggleMute();
    }
  });
};

TabModel.prototype.draw = function () {
  const panel = document.getElementById("movie_player");
  if (!panel || !this.Greyout) return;

  const rect = panel.getBoundingClientRect();

  //Model.Greyout.style.height = rect.height - 0.5 + "px"; //nice yellow strip
  this.Greyout.style.height = rect.height + "px";
  this.Greyout.style.width = rect.width + "px";
  this.Greyout.style.top = rect.top + "px";
  this.Greyout.style.left = rect.left + "px";

  this.PowerButton.style.left = rect.right - 200 + "px";
  this.AudioButton.style.left = rect.right - 150 + "px";

  const text = this.State.GetDurationText();
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
  const words = [
    "",
    "adserve",
    "ads",
    "_ad",
    "podium",
    "doubleclick",
    "chatan",
    "javascript:window",
    "about:blank",
  ];

  const match = (w, s) => w.indexOf(s) > -1;

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const id = frame.getAttribute("id") || "";
    const name = frame.getAttribute("name") || "";
    const src = frame.getAttribute("src") || "";
    const hit = words.find(
      (word) => match(word, id) || match(word, name) || match(src, name)
    );
    if (hit) {
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

// Timer

function startTimer() {
  if (Model && Model.hasOwnProperty("State")) {
    if (Model.State.RemoveAds) {
      removeFrameAds();
    }

    if (Model.State.YouTubeMute && isYoutube) {
      Model.tick();
      muteYouTubeAds();
      removeVideoAds();
    }
  }

  Timer = setTimeout(startTimer, interval);
}

/// INITIALIZATION
startTimer();
connect();
