// ticket
addClockWidget();
const indieVoxTicket = globalThis.location?.hostname === 'www.indievox.com';

let ticketOptions = document.querySelectorAll("#ticketPriceList select:first-of-type option");
if (ticketOptions.length) {
  chrome.storage.local.get(indieVoxTicket ? {
    IndieVoxTicketNumber: 0
  } : {
    TicketNumber: 0,
    AutoClickAllowInsufficient: false
  }, items => {
    const target = Number(indieVoxTicket ? items.IndieVoxTicketNumber : items.TicketNumber);
    if (!Number.isInteger(target) || target < 0 || (!indieVoxTicket && target > 4)) return;
    const available = [...ticketOptions].filter(option =>
      !option.disabled && Number.isInteger(Number(option.value)) && Number(option.value) > 0);
    const exact = available.find(option => Number(option.value) === target);
    const lower = available.filter(option => target === 0 || Number(option.value) <= target)
      .sort((a, b) => Number(b.value) - Number(a.value))[0];
    const chosen = target === 0 || items.AutoClickAllowInsufficient ? lower : exact;
    if (chosen && (!indieVoxTicket || !chosen.selected)) {
      chosen.selected = true;
      if (indieVoxTicket) chosen.closest('select').dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

// scale 2x
let verifyImage = indieVoxTicket ? null : document.getElementById("TicketForm_verifyCode-image");
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
if (agreeCheckbox && !agreeCheckbox.disabled) agreeCheckbox.checked = true;

// please input verify code
let verifyCodeInput = document.getElementById("TicketForm_verifyCode");
if (verifyCodeInput && indieVoxTicket) verifyCodeInput.maxLength = 4;
verifyCodeInput?.focus();
if (verifyCodeInput && !indieVoxTicket) {
  verifyCodeInput.addEventListener("input", () => {
    verifyCodeInput.value = verifyCodeInput.value.replace(/[^a-zA-Z]/g, "").slice(0, 4);
  });

  let hint = document.createElement("div");
  hint.textContent = "輸入完直接按 Enter 購票";
  hint.style.cssText = "color:#d0333c;font-size:12px;margin-top:4px;";
  verifyCodeInput.insertAdjacentElement("afterend", hint);
}
