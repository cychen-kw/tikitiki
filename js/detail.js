linkGameSessions();
addClockWidget();

// login check
let loginText = document.querySelector(".account-login")?.textContent || "";
if (loginText.includes("會員登入")) {
  let todayDate = new Date().toISOString().slice(0, 10);

  chrome.storage.local.get({
    AlertDate: ''
  }, items => {
    if (items.AlertDate != todayDate) {
      alert("!!! === !!!!\n\n加速購買流程\n請先登入\n\n!!! === !!!!");

      var AlertDate = todayDate;
      chrome.storage.local.set({AlertDate});
    }
  });
}

// find link
document.querySelectorAll(".activityContent ul.list-inline a").forEach(a => {
  if (a.getAttribute("href")?.match(/activity\/game\//)) {
    chrome.storage.local.get({
      ProgramOnly: false
    }, items => {
      if (items.ProgramOnly) {
        let link = a.getAttribute("href");
        if (link) {
          window.location.href = link;
        }
      }
    });

    a.click();
  }
});
