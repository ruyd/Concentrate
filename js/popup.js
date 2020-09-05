function sendMessageToTabs(tabs, payload) {
  for (let tab of tabs) {
    chrome.tabs.sendMessage(
      tab.id,
      payload
    , function(e) {
      console.log(e);
    });
  }
}

let doubleClickToggle = document.getElementById("DoubleClickToggle");
let doubleClickInputCheckbox = document.getElementById(
  "DoubleClickInputCheckbox"
);

//Bind
doubleClickInputCheckbox.onclick = () => {
  chrome.storage.sync.set({
    ContentDoubleClick: doubleClickInputCheckbox.checked,
  });

  let msg = { From: "popup", Refresh: true, ContentDoubleClick: doubleClickInputCheckbox.checked };

  chrome.tabs.query({  }, function (tabs) {
     sendMessageToTabs(tabs, msg);
  });
};

//Get
chrome.storage.sync.get("ContentDoubleClick", function (settings) {
  doubleClickInputCheckbox.checked = settings.ContentDoubleClick;
});
