function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function bind() {
  chrome.storage.sync.get("ContentDoubleClick", function (data) {
    if (data.ContentDoubleClick) {
      document.documentElement.addEventListener(
        "dblclick",
        toggleFullScreen,
        false
      );
    }
  });
}

function unbind() {
  document.documentElement.removeEventListener(
    "dblclick",
    toggleFullScreen,
    false
  );
}

//Listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.Refresh) {
    if (request.ContentDoubleClick) bind();
    else unbind();
  }
});

//Initial State
bind();

/// FORK

//YouTube Quiet Down

function removeAds() {
  let strip = ["video-ads ytp-ad-module"];
  let elements = document.getElementsByClassName("video-ads");
  for (let i = 0; i < elements.length; i++) {
    elements[i].remove();
  }
}

var didWeMute = false; 
function muteAds() { 
  let btns = document.getElementsByClassName("ytp-mute-button");
  let btn = btns.length > 0 ? btns[0] : null;
  let muted = btn ? btn.getAttribute("aria-label").toLowerCase().indexOf("unmute") > -1 : false;
  let showing = document.getElementsByClassName("ad-showing").length > 0;//ad-interrupting  
  
  if (!showing && didWeMute) {
    console.log('Content back -> unmuting');
    btn.click();
    didWeMute = false;
  } 

  if (showing && !muted) {
    console.log('muting ad');
    btn.click();
    didWeMute = true; 
  }  
}

function startTime() {
  removeAds();
  muteAds();
  var t = setTimeout(startTime, 5000);
}

setTimeout(startTime, 1000);

//CB Mute

