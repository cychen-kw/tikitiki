// floating clock + auto-click quick toggle, shared across area/detail/game/verify/ticket pages
function addClockWidget(onToggleOn) {
  chrome.storage.local.get({ WidgetEnabled: true, AutoClickArea: false }, items => {
    if (!items.WidgetEnabled) return;

    let widget = document.createElement("div");
    widget.id = "tikitikiWidget";
    widget.style.cssText =
      "position:fixed;top:14px;right:14px;z-index:999999;" +
      "font-family:-apple-system,'Segoe UI','PingFang TC','Microsoft JhengHei',sans-serif;" +
      "background:#fff;border:1px solid #e2e2e2;border-radius:12px;" +
      "padding:10px 16px 10px;min-width:120px;text-align:center;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.12);transition:padding .15s,min-width .15s;";
    let btnStyle = "position:absolute;top:2px;width:22px;height:22px;display:flex;" +
      "align-items:center;justify-content:center;cursor:pointer;color:#999;" +
      "font-size:15px;line-height:1;border-radius:50%;";
    widget.innerHTML =
      '<span id="tikitikiMinimize" title="縮小" style="' + btnStyle + 'right:24px;">–</span>' +
      '<span id="tikitikiClose" title="關閉小工具" style="' + btnStyle + 'right:2px;">✕</span>' +
      '<div id="tikitikiBrand" style="font-size:10px;letter-spacing:.5px;color:#d0333c;' +
        'font-weight:700;margin-bottom:2px;">🎟️ tikitiki</div>' +
      '<div id="tikitikiClock" style="font-size:20px;font-weight:700;color:#222;' +
        'font-variant-numeric:tabular-nums;"></div>' +
      '<label id="tikitikiToggleRow" style="display:flex;align-items:center;gap:6px;justify-content:center;' +
        'margin-top:6px;padding-top:6px;border-top:1px solid #f0f0f0;' +
        'font-size:12px;color:#555;cursor:pointer;">' +
        '<input type="checkbox" id="tikitikiAutoClickToggle" style="accent-color:#d0333c;">' +
        '<span>自動點擊</span>' +
      '</label>';
    document.body.appendChild(widget);

    let clock = widget.querySelector("#tikitikiClock");
    function tick() {
      clock.textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    }
    tick();
    let tickInterval = setInterval(tick, 1000);

    let closeBtn = widget.querySelector("#tikitikiClose");
    closeBtn.addEventListener("click", () => {
      chrome.storage.local.set({ WidgetEnabled: false });
      clearInterval(tickInterval);
      widget.remove();
    });

    let brand = widget.querySelector("#tikitikiBrand");
    let toggleRow = widget.querySelector("#tikitikiToggleRow");
    let minimizeBtn = widget.querySelector("#tikitikiMinimize");

    [closeBtn, minimizeBtn].forEach(btn => {
      btn.addEventListener("mouseenter", () => btn.style.background = "#f2f2f2");
      btn.addEventListener("mouseleave", () => btn.style.background = "transparent");
    });

    let minimized = false;
    minimizeBtn.addEventListener("click", () => {
      minimized = !minimized;
      brand.style.display = minimized ? "none" : "";
      toggleRow.style.display = minimized ? "none" : "";
      minimizeBtn.textContent = minimized ? "▢" : "–";
      minimizeBtn.title = minimized ? "放大" : "縮小";
      widget.style.padding = minimized ? "6px 30px 6px 12px" : "10px 16px 10px";
      widget.style.minWidth = minimized ? "0" : "120px";
    });

    let toggle = widget.querySelector("#tikitikiAutoClickToggle");
    toggle.checked = items.AutoClickArea;
    toggle.addEventListener("change", () => {
      chrome.storage.local.set({ AutoClickArea: toggle.checked });
      if (toggle.checked && onToggleOn) onToggleOn();
    });
  });
}
