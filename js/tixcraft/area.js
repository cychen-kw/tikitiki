// area
const badAreaArray = ["遮擋", "護網", "鐵網", "不完整"];

const highlightStyle = document.createElement('style');
highlightStyle.textContent = 'ul.area-list > li.tikitiki-area-match, ul.area-list > li.tikitiki-area-match > a { background-color: #fff3bf !important; }';
document.head.appendChild(highlightStyle);

// A purely numeric keyword (e.g. "800", "2,800") means "match this exact price",
// not "contains this digit sequence" — otherwise "800" wrongly matches "2800".
function keywordMatches(text, keyword, priceMatch) {
  const normalizedKeyword = keyword.replace(/,/g, '');
  if (priceMatch && /^\d+$/.test(normalizedKeyword)) {
    // The price ends the area label; availability is appended after it.
    const label = text.replace(/(?:剩餘\s*\d+.*|\d+\s*seat\(s\)\s*remaining.*|熱賣中.*|Available.*|已售完.*|Sold out.*)$/i, '').trim();
    const price = label.match(/(?:^|[^\d,])((?:\d{1,3}(?:,\d{3})+|\d+))\s*(?:元|TWD)?$/i);
    return price?.[1].replace(/,/g, '') === normalizedKeyword;
  }
  return text.includes(keyword);
}

function highlightAreas(keywordString, priceMatch) {
  const keywords = keywordString.split(',').filter(Boolean);
  document.querySelectorAll('ul.area-list > li').forEach(li => {
    li.classList.toggle('tikitiki-area-match', keywords.some(keyword => keywordMatches(li.textContent, keyword, priceMatch)));
  });
}

let currentPriceMatch = true;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.AreaKeywordPriceMatch) currentPriceMatch = changes.AreaKeywordPriceMatch.newValue;
  if (changes.AutoClickAreaName) highlightAreas(changes.AutoClickAreaName.newValue || '', currentPriceMatch);
  if (changes.AutoClickArea?.newValue === true) clickCurrentArea();
});

function runAutoClickArea(keywordString, tieBreak, neededTickets, allowInsufficient, priceMatch) {
  // no keywords means every area is acceptable
  let keywords = keywordString.length ? keywordString.split(',') : [];
  let candidates = [];

  document.querySelectorAll("ul.area-list > li").forEach((li, domIndex) => {
    if (li.offsetParent === null) return; // skip areas hidden by display rules

    let a = li.querySelector("a");
    if (!a) return; // sold out / unavailable, no link to click

    let text = li.textContent;
    let keywordIndex = keywords.length ? keywords.findIndex(el => keywordMatches(text, el, priceMatch)) : 0;
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
  HiddenAreaName: "",
  AreaName: "",
  AutoClickArea: false,
  AutoClickAreaName: "",
  AutoClickTieBreak: "keyword",
  AutoClickAllowInsufficient: false,
  TicketNumber: 0,
  AreaKeywordPriceMatch: true
}, items => {
  currentPriceMatch = items.AreaKeywordPriceMatch;
  highlightAreas(items.AutoClickAreaName, currentPriceMatch);
  // TicketNumber 0 means "max available", so any ticket at all counts as enough
  let neededTickets = items.TicketNumber > 0 ? parseInt(items.TicketNumber, 10) : 1;

  const AreaNameArray = items.AreaName.split(',').map(keyword => keyword.trim()).filter(Boolean);
  if (AreaNameArray.length) {
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (!AreaNameArray.some(el => keywordMatches(li.textContent, el, items.AreaKeywordPriceMatch))) {
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
      if (/身障|身心障礙|輪椅/.test(li.textContent)) {
        li.style.display = "none";
      }
    });
  }

  if (items.HideSoldOutArea) {
    document.querySelectorAll("ul.area-list > li").forEach(li => {
      if (!li.querySelector("a")) li.style.display = "none";
    });
  }

  const hiddenKeywords = items.HiddenAreaName.split(',').map(keyword => keyword.trim()).filter(Boolean);
  document.querySelectorAll('ul.area-list > li').forEach(li => {
    if (hiddenKeywords.some(keyword => keywordMatches(li.textContent, keyword, items.AreaKeywordPriceMatch))) li.style.display = 'none';
  });

  if (items.AutoClickArea) {
    runAutoClickArea(items.AutoClickAreaName, items.AutoClickTieBreak, neededTickets, items.AutoClickAllowInsufficient, items.AreaKeywordPriceMatch);
  }

  addClockWidget();
});

function clickCurrentArea() {
  chrome.storage.local.get({ AutoClickAreaName: '', AutoClickTieBreak: 'keyword', TicketNumber: 0, AutoClickAllowInsufficient: false, AreaKeywordPriceMatch: true }, current => {
    const needed = Number(current.TicketNumber) > 0 ? Number(current.TicketNumber) : 1;
    runAutoClickArea(current.AutoClickAreaName, current.AutoClickTieBreak, needed, current.AutoClickAllowInsufficient, current.AreaKeywordPriceMatch);
  });
}
