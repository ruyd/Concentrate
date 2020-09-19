const doubleClickInputCheckbox = document.getElementById("DoubleClickInputCheckbox");
const youTubeInputCheckbox = document.getElementById("YouTubeInputCheckbox");
const iFrameInputCheckbox = document.getElementById("iFrameInputCheckbox");
const clickInputCheckbox = document.getElementById("ClickInputCheckbox");
const clockInputCheckbox = document.getElementById("ClockInputCheckbox");
const colorInput = document.getElementById("color");

function get() {
  chrome.storage.sync.get("Settings", function (data) {
    let s = data.Settings;
    doubleClickInputCheckbox.checked = s.ContentDoubleClick;
    iFrameInputCheckbox.checked = s.FrameAds;
    clickInputCheckbox.checked = s.Click;
    youTubeInputCheckbox.checked = s.YouTubeMute;
    clockInputCheckbox.checked = s.ShowClock;
    colorInput.value = s.Color || "";
  });
}

function save() {
  chrome.storage.sync.set({
    Settings: {
      ContentDoubleClick: doubleClickInputCheckbox.checked,
      Color: colorInput.value,
      Click: youTubeInputCheckbox.checked,
      FrameAds: iFrameInputCheckbox.checked,
      YouTubeMute: clickInputCheckbox.checked,
      ShowClock: clockInputCheckbox.checked,
    },
  });
}

doubleClickInputCheckbox.onchange = save;
youTubeInputCheckbox.onchange = save;
iFrameInputCheckbox.onchange = save;
clickInputCheckbox.onchange = save;
clockInputCheckbox.onchange = save;
colorInput.onchange = save;

get();
