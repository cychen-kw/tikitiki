function stripBrackets(str) {
  return str.replace('「', '').replace('」', '');
}

chrome.storage.local.get({ AutoClickArea: false }, items => {
  addClockWidget(items.AutoClickArea);
});

// credit check
let title = document.querySelector(".activityT.title")?.textContent || "";
let num = "";

if (title.includes("中信")) {
  num = "418230";
} else if (title.includes("富邦")){
  num = "552046";
} else if (title.includes("玉山")){
  num = "524255";
} else {
  num = "";
}

let checkCodeInput = document.querySelector("input[name=checkCode]");
if (checkCodeInput) {
  chrome.storage.local.get({
    VerifyCode: ""
  }, items => {
    if (num === "" && items.VerifyCode) {
      num = items.VerifyCode;
    }

    let agreeItems = document.querySelectorAll(".promo-desc font");
    if (num === "" && agreeItems.length) {
      let text = Array.from(agreeItems).map(el => el.textContent).join('');
      num = stripBrackets(text);
    }

    checkCodeInput.value = num;
    checkCodeInput.focus();
  });
}

// click the highlighted red text (tixcraft's actual instruction) to fill it in
document.querySelectorAll(".promo-desc font[color]").forEach(font => {
  font.style.cursor = "pointer";
  font.addEventListener("click", () => {
    if (!checkCodeInput) return;
    checkCodeInput.value = stripBrackets(font.textContent);
    checkCodeInput.focus();
  });
});
