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

// Objects

function Greyout() {
  const node = createElement("greyout", "concentrate");
  node.remaining = createElement("remaining", "concentrate");
  node.appendChild(node.remaining);
  node.hide = function () {
    node.style.display = "none";
  };
  node.show = function () {
    node.style.display = "display";
  };

  node.setText = (s) => {
    node.remaining.innerText = s;
  };

  return node;
}

function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new TabState(settings);
  this.Greyout = Greyout();
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
  this.AdRemover = true;
  this.YouTubeMute = true;
  this.ShowClock = true;
  this.GrayingOn = true;
  this.MutingOn = true;
  this.SkipAds = true;
  if (loaded) {
    Object.assign(loaded, this);
  }
}

function makeButton(id, label) {
  const node = createElement(id);
  const btn = new Button(node);
  btn.Label = label;
  return btn;
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

TabState.prototype.reset = function () {
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

TabState.prototype.GetDurationText = function () {
  const duration = this.DurationInSeconds;

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

export default TabModel;
