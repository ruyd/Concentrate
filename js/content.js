"use strict";
//content.js -> Connection -> Custom Events -> content_module.js
//webpack?
var Port;
const log = console.log.bind(window.console);
const element = document.body || document.head || document.documentElement;
const resources = ["js/content_module.js"];

//Worker
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

//Messaging
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
  //var evt = document.createEvent("CustomEvent");
  var evt = new CustomEvent("concentrateEvent", {
    bubbles: true,
    detail: message,
  });
  document.dispatchEvent(evt);
  log("evt", evt);
}

// document
//   .getElementById("myCustomEventDiv")
//   .addEventListener("myCustomEvent", function () {
//     var eventData = document.getElementById("myCustomEventDiv").innerHTML;

//   });

///
connect();
