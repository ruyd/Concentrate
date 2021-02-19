const Context = {
  Tab: null,
  State: {
    ContentDoubleClick: true,
    RemoveAds: true,
    RemoveComments: true,
    MutingOn: true,
    EnableAutoScroll: false,
    SkipAds: false,
  },
};

// Form
const checkboxes = new Map();
const keys = Object.keys(Context.State);
keys.forEach((a) => {
  const el = document.getElementById(a + "InputCheckbox");
  if (el) checkboxes.set(a, el);
});

//Bind
checkboxes.forEach((input) => (input.onclick = onClickHandler));
function onClickHandler(e) {
  checkboxes.forEach((checkbox, key) => {
    Context.State[key] = checkbox.checked;
  });

  send();
}

// Actions
function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (let tab of tabs) {
      background({
        action: "state.get",
        payload: tab.id,
      });
    }
  });
}

chrome.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler({ action, payload }) {
  switch (action) {
    case "state.set":
      setState(payload);
      break;

    default:
      break;
  }
}
function setState({ Tab, SavedSettings }) {
  Context.Tab = Tab;
  Object.assign(Context.State, SavedSettings);
  checkboxes.forEach((checkbox, key) => {
    checkbox.checked = Context.State[key];
  });
  console.log("state", SavedSettings, Tab);
}

function background(message) {
  chrome.runtime.sendMessage(message);
}

// Think, persist by site? or always in-memory
function commitToStorage() {
  chrome.storage.sync.set({ Settings: Context.State });
}

function send() {
  let msg = {
    action: "update",
    payload: Context.State,
    id: Context.Tab.id,
  };

  background(msg);

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg);
    }
  });
}

//////
init();
