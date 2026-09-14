// ticket
addClockWidget();

let ticketOptions = document.querySelectorAll("#ticketPriceList select:first-of-type option");
if (ticketOptions.length) {
  chrome.storage.local.get({
    TicketNumber: 0,
    AutoClickAllowInsufficient: false
  }, items => {
    const target = Number(items.TicketNumber);
    if (!Number.isInteger(target) || target < 0 || target > 4) return;
    const available = [...ticketOptions].filter(option =>
      !option.disabled && Number.isInteger(Number(option.value)) && Number(option.value) > 0);
    const exact = available.find(option => Number(option.value) === target);
    const lower = available.filter(option => target === 0 || Number(option.value) <= target)
      .sort((a, b) => Number(b.value) - Number(a.value))[0];
    const chosen = target === 0 || items.AutoClickAllowInsufficient ? lower : exact;
    if (chosen) chosen.selected = true;
  });
}

// scale 2x
let verifyImage = document.getElementById("TicketForm_verifyCode-image");
if (verifyImage) {
  if (verifyImage.width == 0) {
    verifyImage.width = 240;
    verifyImage.height = 200;
  } else {
    verifyImage.width = verifyImage.width * 2;
  }
}

// ticket agree mode 1
let agreeCheckbox = document.getElementById("TicketForm_agree");
if (agreeCheckbox) agreeCheckbox.checked = true;

// please input verify code
let verifyCodeInput = document.getElementById("TicketForm_verifyCode");
if (verifyCodeInput) {
  verifyCodeInput.focus();
  verifyCodeInput.addEventListener("input", () => {
    verifyCodeInput.value = verifyCodeInput.value.replace(/[^a-zA-Z]/g, "").slice(0, 4);
  });

  let hint = document.createElement("div");
  hint.textContent = "輸入完直接按 Enter 購票";
  hint.style.cssText = "color:#d0333c;font-size:12px;margin-top:4px;";
  verifyCodeInput.insertAdjacentElement("afterend", hint);
}
