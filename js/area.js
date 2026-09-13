// area
const badAreaArray = ["遮擋", "護網", "鐵網", "不完整"];

function runAutoClickArea(keywordString, tieBreak, neededTickets) {
  // no keywords means every area is acceptable
  let keywords = keywordString.length ? keywordString.split(',') : [];
  let candidates = [];

  document.querySelectorAll("ul.area-list > li").forEach((li, domIndex) => {
    if (li.offsetParent === null) return; // hidden by HideBadArea/HideDisabledArea/ShowOnlyArea

    let a = li.querySelector("a");
    if (!a) return; // sold out / unavailable, no link to click

    let text = li.textContent;
    let keywordIndex = keywords.length ? keywords.findIndex(el => text.includes(el)) : 0;
    if (keywordIndex === -1) return;

    let hot = text.includes("熱賣中");
    let match = text.match(/剩餘\s*(\d+)/);
    let remaining = match ? parseInt(match[1], 10) : -1;
    let enough = hot || remaining >= neededTickets; // just needs to be enough, not the most

    candidates.push({ a, hot, enough, keywordIndex, domIndex, rand: Math.random() });
  });

  candidates.sort((a, b) => {
    if (a.hot !== b.hot) return a.hot ? -1 : 1;
    if (a.enough !== b.enough) return a.enough ? -1 : 1;

    // tie: fall back to the user's chosen preference
    switch (tieBreak) {
      case "top": return a.domIndex - b.domIndex;
      case "bottom": return b.domIndex - a.domIndex;
      case "random": return a.rand - b.rand;
      case "keyword":
      default: return a.keywordIndex - b.keywordIndex;
    }
  });

  if (candidates.length) {
    candidates[0].a.click();
  }
}

chrome.storage.local.get({
  HideBadArea: false,
  HideDisabledArea: false,
  ShowOnlyArea: false,
  AreaName: "",
  AutoClickArea: false,
  AutoClickAreaName: "",
  AutoClickTieBreak: "keyword",
  TicketNumber: 0
}, items => {
  // TicketNumber 0 means "max available", so any ticket at all counts as enough
  let neededTickets = items.TicketNumber > 0 ? parseInt(items.TicketNumber, 10) : 1;

  if (items.ShowOnlyArea && items.AreaName.length) {
    let AreaNameArray = items.AreaName.split(',');
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (!AreaNameArray.some(el => li.textContent.includes(el))) {
        li.style.display = "none";
      }
    });
  }

  if (items.HideBadArea) {
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (badAreaArray.some(el => li.textContent.includes(el))) {
        li.style.display = "none";
      }
    });
  }

  if (items.HideDisabledArea) {
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (li.textContent.includes("身障")) {
        li.style.display = "none";
      }
    });
  }

  if (items.AutoClickArea) {
    runAutoClickArea(items.AutoClickAreaName, items.AutoClickTieBreak, neededTickets);
  }

  addClockWidget(items.AutoClickArea, () => runAutoClickArea(items.AutoClickAreaName, items.AutoClickTieBreak, neededTickets));
});

// hide no link area
document.querySelectorAll("ul.area-list > li").forEach(li => {
  if (!li.querySelector("a")) li.style.display = "none";
});
