// area
const badAreaArray = ["遮擋", "護網", "鐵網", "不完整"];

function runAutoClickArea(keywordString, tieBreak, neededTickets, allowInsufficient) {
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

    if (!allowInsufficient) {
      // area names and bad-area labels stay Chinese even in English mode,
      // but the hot/remaining status text is translated, so match both
      let hot = text.includes("熱賣中") || text.includes("Available");
      let match = text.match(/剩餘\s*(\d+)/) || text.match(/(\d+)\s*seat\(s\)\s*remaining/i);
      let remaining = match ? parseInt(match[1], 10) : -1;
      if (!hot && remaining < neededTickets) return; // not enough tickets, skip
    }

    let hot = text.includes("熱賣中") || text.includes("Available");
    let match = text.match(/剩餘\s*(\d+)/) || text.match(/(\d+)\s*seat\(s\)\s*remaining/i);
    let remaining = match ? parseInt(match[1], 10) : -1;

    candidates.push({ a, keywordIndex, domIndex, hot, remaining, rand: Math.random() });
  });

  if (!candidates.length) return;

  if (tieBreak === "remaining") {
    // hot areas have no visible count, treat them as the top tier;
    // among whoever's tied for the most tickets, pick randomly
    let topTier = candidates.some(c => c.hot)
      ? candidates.filter(c => c.hot)
      : candidates.filter(c => c.remaining === Math.max(...candidates.map(c => c.remaining)));
    topTier[Math.floor(Math.random() * topTier.length)].a.click();
    return;
  }

  candidates.sort((a, b) => {
    switch (tieBreak) {
      case "top": return a.domIndex - b.domIndex;
      case "bottom": return b.domIndex - a.domIndex;
      case "random": return a.rand - b.rand;
      case "keyword":
      default: return a.keywordIndex - b.keywordIndex;
    }
  });

  candidates[0].a.click();
}

chrome.storage.local.get({
  HideBadArea: false,
  HideDisabledArea: false,
  HideSoldOutArea: true,
  ShowOnlyArea: false,
  AreaName: "",
  AutoClickArea: false,
  AutoClickAreaName: "",
  AutoClickTieBreak: "keyword",
  AutoClickAllowInsufficient: false,
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

  if (items.HideSoldOutArea) {
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (!li.querySelector("a")) li.style.display = "none";
    });
  }

  if (items.AutoClickArea) {
    runAutoClickArea(items.AutoClickAreaName, items.AutoClickTieBreak, neededTickets, items.AutoClickAllowInsufficient);
  }

  addClockWidget(() => runAutoClickArea(items.AutoClickAreaName, items.AutoClickTieBreak, neededTickets, items.AutoClickAllowInsufficient));
});
