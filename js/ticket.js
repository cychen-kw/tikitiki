// ticket
addClockWidget();

let ticketOptions = document.querySelectorAll("#ticketPriceList select:first-of-type option");
if (ticketOptions.length) {
  chrome.storage.local.get({
    TicketNumber: 0
  }, items => {
    let selected = false;

    if (items.TicketNumber > 0) {
      for (let option of ticketOptions) {
        if (option.value == items.TicketNumber) {
          option.selected = true;
          selected = true;
          break;
        }
      }
    }
    // if ticket number can't find or last
    if (!selected) {
      ticketOptions[ticketOptions.length - 1].selected = true;
    }
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
document.getElementById("TicketForm_verifyCode")?.focus();
