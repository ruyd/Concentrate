function div(id, cls) {
  const node = document.createElement("div");
  node.setAttribute("id", id);
  node.setAttribute("class", cls);
  return node;
}

function Greyout() {
  const node = div("greyout", "concentrate");
  node.remaining = div("remaining", "concentrate");
  node.appendChild(node.remaining);
  node.hide = () => {
    this.style.display = "none";
  };
  node.show = () => {
    this.style.display = "display";
  };
  return node;
}

function GetButton(cls) {
  const buttons = document.getElementsByClassName(cls);
  const node = buttons.length > 0 ? buttons[0] : null;
  return node;
}

function GetMuteButton() {
  const node = GetButton("ytp-mute-button");
  return node ? new MuteButton(node) : null;
}

function GetSkipButton() {
  const node = GetButton("ytp-ad-skip-button");
  return node ? new Button(node) : null;
}

function GetPlayButton() {
  const node = GetButton("ytp-play-button");
  return node ? new Button(node) : null;
}

function isMuted(element) {
  //change to class
  //ytp-unmute
  const label = element ? element.getAttribute("title") ?? "" : "";
  return label.toLowerCase().indexOf("unmute") > -1;
}

// Prototypes

TabModel.prototype.detect = () => {
  if (!this.State) return;
  this.State.Showing = document.getElementsByClassName("ad-showing").length > 0;
  this.State.Playing = document.getElementsByClassName("ad-showing").length > 0;

  const durations = document.getElementsByClassName("ytp-time-duration");
  const duration = durations.length > 0 ? durations[0].textContent : null;
  const dsplit = (duration || "").split(":");
  this.State.DurationSeconds = parseInt(dsplit[0]) * 60 + parseInt(dsplit[1]);

  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();

  
    //ytp class: paused-mode
  
    const btns = document.getElementsByClassName("ytp-play-button");
    if (btns.length === 0) return false;
    const btn = btns[0];
    const label = btn.getAttribute("title") ?? "";
    return label.toLowerCase().indexOf("pause") > -1;
  }
};

TabModel.prototype.reset = () => {
  this.State.DidWeMute = false;
  this.DurationSeconds = 0;
};

TabModel.prototype.skip = () => {
  if (!this.SkipButton) return;
  this.SkipButton.click();
  this.reset();
};

TabModel.prototype.mute = () => {
  if (!this.MuteButton) return;
  muteButton.click();
  Model.State.DidWeMute = true;
  refresh(true);
};

TabModel.prototype.unmute = () => {
  if (!this.MuteButton || !this.MuteButton.isMuted()) return;
  this.MuteButton.click();
  this.reset();
};

TabModel.prototype.inject = () => {
  document.body.appendChild(this.Greyout);
  document.body.appendChild(this.AudioButton);
  document.body.appendChild(this.PowerButton);
};

TabModel.prototype = {
  toggleMute: () => {
    console.log("mute");
  },
  toggleGray: () => {
    console.log("gray");
  },
};

TabModel.prototype.toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

TabModel.prototype.bind = () => {
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

// Objects

function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new TabState(settings);
  this.Greyout = Greyout();
  this.SoundButton = getButton("audio");
  this.PowerButton = getButton("power");
  this.MuteButton = GetMuteButton();
  this.SkipButton = GetSkipButton();
  this.PlayButton = GetPlayButton();
  this.IsYoutube = () =>
    this.Tab && this.Tab.url && this.Tab.url.indexOf("youtube") > 1;
}

class TabState extends Settings {
  constructor() {
    super();
    this.DidWeMute = false;
    this.SecondCounter = 0;
    this.LastDuration = null;
    this.isFullscreen = false;
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

function getButton(id, label) {
  const node = div(id);
  return new Button(node, label);
}

function Button(node, label) {  
  this.Node = node;
  this.State = false;
  this.Label = label;
  this.set = function () {
    this.Node.setAttribute("class", this.State ? "on" : "off");
    this.Node.setAttribute(
      "title",
      `Switch ${this.Label} ${this.State ? "OFF" : "ON"}`
    );
  };

  this.hide = () => {
    this.style.display = "none";
  };
  this.show = () => {
    this.style.display = "display";
  };

  this.click = () => this.Node.click();

  this.set();
}

function MuteButton(element) {
  this.Node = element;
  this.isMuted = () => isMuted(element);
  this.click = () => this.Node.click();
}

export default TabModel;
