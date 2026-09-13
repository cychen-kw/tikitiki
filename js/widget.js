// floating clock + auto-click quick toggle, shared across area/detail/game/verify/ticket pages
function addClockWidget(autoClickOn, onToggleOn) {
  let widget = document.createElement("div");
  widget.id = "tikitikiWidget";
  widget.style.cssText = "position:fixed;top:12px;right:12px;z-index:99999;" +
    "background:#fff;border:1px solid #ccc;border-radius:8px;padding:8px 14px;" +
    "font-family:monospace;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.15);";
  widget.innerHTML =
    '<div id="tikitikiClock" style="font-size:18px;font-weight:bold;color:#222;"></div>' +
    '<label style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:4px;' +
    'font-size:13px;color:#444;cursor:pointer;">' +
      '<input type="checkbox" id="tikitikiAutoClickToggle">' +
      '<span>自動點擊</span>' +
    '</label>';
  document.body.appendChild(widget);

  let clock = widget.querySelector("#tikitikiClock");
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);

  let toggle = widget.querySelector("#tikitikiAutoClickToggle");
  toggle.checked = autoClickOn;
  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ AutoClickArea: toggle.checked });
    if (toggle.checked && onToggleOn) onToggleOn();
  });
}
