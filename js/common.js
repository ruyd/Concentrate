export function Settings(loaded) {
  this.ContentDoubleClick = true;
  this.NewTabColor = "#242424";
  this.NewTabClick = true;
  this.RemoveAds = true;
  this.RemoveComments = true;
  this.YouTubeMute = true;
  this.ShowClock = true;
  this.GrayingOn = true;
  this.MutingOn = true;
  this.SkipAds = true;
  this.LabelWindowNewTabs = true;

  if (loaded) {
    Object.assign(loaded, this);
  }
}

export function TabModel(chrome_tab, settings) {
  this.Tab = chrome_tab;
  this.SavedSettings = settings;
}

export default Settings;
