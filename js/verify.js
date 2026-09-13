function stripBrackets(str) {
  return str.replace('「', '').replace('」', '');
}

addClockWidget();

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

    let promoDesc = document.querySelector(".promo-desc");
    if (num === "" && promoDesc) {
      let stripped = stripBrackets(promoDesc.textContent.trim());
      if (/^\d+$/.test(stripped)) {
        num = stripped; // only auto-fill when it's actually a code, not instruction text
      }
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
