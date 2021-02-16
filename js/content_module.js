"use strict";
import "./common.js";

function onMessageEvent(event) {
  log("onEvent", event);
  const action = event.type;
  switch (action) {
    case "ping":
      break;
    case "model":
      break;
    default:
      break;
  }
}

///
var l = window.addEventListener("concentrateEvent", onMessageEvent, true);
startTimer();
console.log("content_module.js", l);
