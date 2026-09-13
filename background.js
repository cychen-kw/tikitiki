// Called when the user clicks on the browser action.
chrome.action.onClicked.addListener(tab => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("options.html")
  })
});
