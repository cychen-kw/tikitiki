// auto-agree to terms & privacy policy checkbox on the KKTIX registration page.
// Angular can re-render/reset the checkbox after our click (e.g. once it finishes
// bootstrapping and applies its own model state), and that reset is a plain
// property change that MutationObserver won't catch. So instead of clicking once,
// keep re-checking for a while and re-click whenever it drifts back to unchecked.
let attempts = 0;
let poll = setInterval(() => {
  attempts++;
  let checkbox = document.getElementById("person_agree_terms");
  if (checkbox && !checkbox.checked) {
    checkbox.click(); // real click so AngularJS's ng-model picks it up
  }
  if (attempts >= 20) clearInterval(poll); // give up after ~10s
}, 500);
