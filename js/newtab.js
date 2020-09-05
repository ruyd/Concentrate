function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen(); 
      }
    }
}

document.documentElement.addEventListener("click", function(e) {
  toggleFullScreen();    
}, false);
  
 