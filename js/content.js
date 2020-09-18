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

//YouTube Quiet Down
var isYoutube = document.getElementsByClassName("ytd-player").length > 0;
var style = document.createElement('style');
style.innerHTML =
	'.concentrate {' +
		'color: #242424;' +
		'background-color: #242424;' +
    'opacity: 0.999;' +
    'z-index: 99999;' + 
    'display: none;' +
    'position: fixed;' +  
    'height: 100%;' + 
    'width: 100%;' +
    'top: 0; left: 0;' +     
    'transition: all 0.3s;' +
    'user-select: none;' +    
  '} ' + 
  '.concentrate:hover {' + 
    'opacity: 0;' + 
  '}';
  
var ref = document.querySelector('script');
ref.parentNode.insertBefore(style, ref);

var greyout = document.createElement('div');
greyout.setAttribute("id", "greyout");
greyout.setAttribute("class", "concentrate")
document.body.appendChild(greyout);
greyout.onmouseover = () => { greyout.style.display = "none"; };

function removeAds() {
  let strip = ["video-ads ytp-ad-module"];
  let elements = document.getElementsByClassName("video-ads");
  for (let i = 0; i < elements.length; i++) {
    elements[i].remove();
  }
}

function resize() {
  let panel = document.getElementById("movie_player");  
  if (!panel || !greyout) return;

  let coor = panel.getBoundingClientRect();
  
  greyout.style.height = coor.height + "px";
  greyout.style.width = coor.width + "px";
  greyout.style.top = coor.top + "px";
  greyout.style.left = coor.left + "px";

}
 

var didWeMute = false; 
function muteAds() { 
  let btns = document.getElementsByClassName("ytp-mute-button");
  //if (btns.length === 0) return;

  let btn = btns.length > 0 ? btns[0] : null;
  let muted = btn ? btn.getAttribute("aria-label").toLowerCase().indexOf("unmute") > -1 : false;
  let showing = document.getElementsByClassName("ad-showing").length > 0;//ad-interrupting  

  if (!showing) {

    if (didWeMute)
    {
      console.log('Content back -> unmuting');
      btn.click();    
      didWeMute = false;
    }
    
    greyout.style.display = "none";
  } 

  if (showing) {

    if (!muted)
    {
      console.log('muting ad');
      btn.click();
      didWeMute = true;
    }
    
    resize();
    greyout.style.display = "block";
  }  
}

//CB Mute

//Timer

function startTime() {
  removeAds();
  muteAds();
  var t = setTimeout(startTime, 4000);
}

setTimeout(startTime, 1000);
