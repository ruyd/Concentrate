function sendMessageToTabs(tabs, payload) {
  for (let tab of tabs) {
    chrome.tabs.sendMessage(tab.id, payload, function (e) {
      console.log(e);
    });
  }
}

let doubleClickToggle = document.getElementById("DoubleClickToggle");
let doubleClickInputCheckbox = document.getElementById(
  "DoubleClickInputCheckbox"
);

var Settings = {};
//Bind
doubleClickInputCheckbox.onclick = () => {
  Settings.ContentDoubleClick = doubleClickInputCheckbox.checked;
  chrome.storage.sync.set({ Settings });

  let msg = {
    From: "popup",
    Refresh: true,
    Settings: Settings,
  };

  chrome.tabs.query({}, function (tabs) {
    sendMessageToTabs(tabs, msg);
  });
};

//Get
chrome.storage.sync.get("Settings", function (data) {
  console.log(data);

  if (data.Settings) {
    Settings = data.Settings;
    doubleClickInputCheckbox.checked = data.Settings.ContentDoubleClick;
  }
});
