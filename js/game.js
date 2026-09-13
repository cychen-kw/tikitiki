linkGameSessions();

chrome.storage.local.get({ AutoClickArea: false }, items => {
  addClockWidget(items.AutoClickArea);
});
