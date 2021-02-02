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

function getMuteButton() {
  const muteButtons = document.getElementsByClassName("ytp-mute-button");
  const node = muteButtons.length > 0 ? new MuteButton(muteButtons[0]) : null;
  return node;
}

function isMuted(element) {
  //change to class
  //ytp-unmute
  const label = element ? element.getAttribute("title") ?? "" : "";
  return label.toLowerCase().indexOf("unmute") > -1;
}

// Prototypes

Tab.prototype = {
  toggleMute: () => {
    console.log("mute");
  },
  toggleGray: () => {
    console.log("gray");
  },
};

Tab.prototype.appendIfNeeded = () => {
  if (!isYoutube) return;

  document.body.appendChild(greyout);
  document.body.appendChild(audio_button);
  document.body.appendChild(power_button);
};

Tab.prototype.toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

Tab.prototype.bind = (tabId) => {
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
};

Tab.prototype.unbind = () => {
  document.documentElement.removeEventListener(
    "dblclick",
    toggleFullScreen,
    false
  );
};

Tab.prototype.bindMute = () => {
  const mute = getMuteButton();
  if (!mute) return;
  mute.addEventListener(
    "click",
    (e) => {
      const showing = document.getElementsByClassName("ad-showing").length > 0;
      if (showing) {
        if (e.isTrusted) {
          Model.toggleMute();
        }
      }
    },
    false
  );
};

Tab.prototype.bindGray = () => {
  greyout.onclick = () => {
    Context.GrayingOn = !Context.GrayingOn;
    power_button.setAttribute("class", Context.GrayingOn ? "on" : "off");
    greyout.style.display = Context.GrayingOn ? "display" : "none";

    if (isMuted()) {
      audio_button.click();
    }
  };
};

// Objects

function Tab(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.State = new TabState(settings);
  this.Greyout = Greyout();
  this.SoundButton = new Button("audio");
  this.PowerButton = new Button("power");
  this.MuteButton = getMuteButton();
}

function TabState(settings) {
  this.grayingOn = settings.GrayingOn;
  this.mutingOn = settings.MutingOn;
  this.skipOn = true;
  this.didWeMute = false;
  this.current_seconds_counter = 0;
  this.last_duration = null;
  this.FullscreenF11 = false;
  this.isYoutube = false;
}

function Settings(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.FrameAds = true;
  this.YouTubeMute = true;
  this.ShowClock = true;
  if (loaded) {
    Object.assign(loaded, this);
  }
}

function Button(id) {
  const node = div(id);
  this.Node = node;
  this.State = false;
  this.set = function () {
    //this.setAttribute("class", this.State ? "on" : "off");
    //this.setAttribute("title", `Switch ${this.State ? "OFF" : "ON"}`);
  };

  this.hide = () => {
    this.style.display = "none";
  };
  this.show = () => {
    this.style.display = "display";
  };

  this.set();
}

function MuteButton(element) {
  this.Node = element;
  this.Muted = isMuted(element);
  this.click = () => this.Node.click();
}

export default Tab;
