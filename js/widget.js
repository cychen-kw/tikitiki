// Shared floating clock and platform-specific auto-click toggle.
function addClockWidget(onToggleOn, settingKey = 'AutoClickArea') {
  const kktix = settingKey === 'KktixAutoSelect';
  const ibon = settingKey === 'IbonAutoSelect';
  const orderKey = ibon ? 'IbonTieBreak' : kktix ? 'KktixTieBreak' : 'AutoClickTieBreak';
  const defaultOrder = kktix ? 'top' : 'keyword';
  const orderNames = {
    top: '畫面順序（由上到下）', bottom: '畫面順序（由下到上）',
    keyword: '加入順序', selected: '加入順序', random: '隨機',
    remaining: kktix ? '票種上限最多' : '剩餘票數最多'
  };
  chrome.storage.local.get({ [settingKey]: false, [orderKey]: defaultOrder }, items => {
    if (!document.getElementById("tikitikiWidgetStyle")) {
      let style = document.createElement("style");
      style.id = "tikitikiWidgetStyle";
      style.textContent =
        "#tikitikiAutoClickToggle{background:#ccc;}" +
        "#tikitikiAutoClickToggle::before{content:'';position:absolute;top:2px;left:2px;" +
        "width:14px;height:14px;border-radius:50%;background:#fff;" +
        "box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s;}" +
        "#tikitikiAutoClickToggle:checked{background:#d0333c;}" +
        "#tikitikiAutoClickToggle:checked::before{transform:translateX(14px);}";
      document.head.appendChild(style);
    }

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
      '<span id="tikitikiMinimize" title="縮小" style="' + btnStyle + 'right:2px;">–</span>' +
      '<span id="tikitikiSettings" title="開啟設定頁" style="' + btnStyle + 'left:2px;">⚙️</span>' +
      '<div id="tikitikiBrand" style="font-size:10px;letter-spacing:.5px;color:#d0333c;' +
        'font-weight:700;margin-bottom:2px;">🎟️ tikitiki</div>' +
      '<div id="tikitikiClock" style="font-size:20px;font-weight:700;color:#222;' +
        'font-variant-numeric:tabular-nums;"></div>' +
      '<label id="tikitikiToggleRow" style="display:flex;align-items:center;gap:6px;justify-content:center;' +
        'margin-top:6px;padding-top:6px;border-top:1px solid #f0f0f0;' +
        'font-size:12px;color:#555;cursor:pointer;">' +
        '<input type="checkbox" id="tikitikiAutoClickToggle" style="' +
          'appearance:none;-webkit-appearance:none;box-sizing:border-box;margin:0;padding:0;border:none;' +
          'width:32px;height:18px;border-radius:999px;' +
          'position:relative;cursor:pointer;transition:background .15s;flex-shrink:0;">' +
        '<span>自動點擊</span>' +
      '</label>' +
      '<div id="tikitikiPriority" style="font-size:12px;color:#555;margin-top:6px;"></div>' +
      '<div id="tikitikiLoginWarning" role="status" style="display:none;margin-top:8px;padding:6px 8px;' +
        'border:1px solid #b32029;border-radius:6px;background:#fff0f0;color:#b32029;font-size:13px;font-weight:700;"></div>';
    document.body.appendChild(widget);

    let clock = widget.querySelector("#tikitikiClock");
    clock.title = '拖曳時鐘移動小工具';
    clock.style.cursor = 'grab';
    clock.style.touchAction = 'none';
    clock.style.userSelect = 'none';
    let drag = null;
    function moveWidget(left, top) {
      const rect = widget.getBoundingClientRect();
      widget.style.left = Math.max(0, Math.min(left, window.innerWidth - rect.width)) + 'px';
      widget.style.top = Math.max(0, Math.min(top, window.innerHeight - rect.height)) + 'px';
      widget.style.right = 'auto';
    }
    clock.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return;
      const rect = widget.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
      clock.setPointerCapture(event.pointerId);
      clock.style.cursor = 'grabbing';
      event.preventDefault();
    });
    clock.addEventListener('pointermove', event => {
      if (drag?.id === event.pointerId) moveWidget(event.clientX - drag.x, event.clientY - drag.y);
    });
    function stopDrag(event) {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      clock.style.cursor = 'grab';
      if (clock.hasPointerCapture(event.pointerId)) clock.releasePointerCapture(event.pointerId);
    }
    clock.addEventListener('pointerup', stopDrag);
    clock.addEventListener('pointercancel', stopDrag);
    clock.addEventListener('lostpointercapture', stopDrag);
    function keepVisible() {
      if (!widget.style.left) return;
      const rect = widget.getBoundingClientRect();
      moveWidget(rect.left, rect.top);
    }
    window.addEventListener('resize', keepVisible);
    widget.addEventListener('transitionend', keepVisible);
    const loginWarning = widget.querySelector('#tikitikiLoginWarning');
    function tick() {
      clock.textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      if (kktix || ibon) return;
      const state = typeof getTikitikiLoginState === 'function' ? getTikitikiLoginState() : null;
      const message = state === false ? '⚠ 尚未登入，請先登入' : state === null ? '登入狀態無法確認' : '';
      if (loginWarning.textContent !== message) {
        loginWarning.textContent = message;
        loginWarning.style.display = message ? 'block' : 'none';
        keepVisible();
      }
    }
    tick();
    setInterval(tick, 1000);

    let brand = widget.querySelector("#tikitikiBrand");
    let toggleRow = widget.querySelector("#tikitikiToggleRow");
    let minimizeBtn = widget.querySelector("#tikitikiMinimize");
    const priority = widget.querySelector('#tikitikiPriority');
    function showPriority(value) {
      priority.textContent = '優先：' + (ibon ? '加入順序' : (orderNames[value] || orderNames[defaultOrder]));
    }
    showPriority(items[orderKey]);

    minimizeBtn.addEventListener("mouseenter", () => minimizeBtn.style.background = "#f2f2f2");
    minimizeBtn.addEventListener("mouseleave", () => minimizeBtn.style.background = "transparent");

    let settingsBtn = widget.querySelector("#tikitikiSettings");
    settingsBtn.addEventListener("mouseenter", () => settingsBtn.style.background = "#f2f2f2");
    settingsBtn.addEventListener("mouseleave", () => settingsBtn.style.background = "transparent");
    settingsBtn.addEventListener("click", () => chrome.runtime.sendMessage({ tikitikiOpenOptions: true, platform: ibon ? 'ibon' : kktix ? 'kktix' : 'tixcraft' }));

    let minimized = false;
    minimizeBtn.addEventListener("click", () => {
      minimized = !minimized;
      brand.style.display = minimized ? "none" : "";
      toggleRow.style.display = minimized ? "none" : "";
      priority.style.display = minimized ? "none" : "";
      minimizeBtn.textContent = minimized ? "▢" : "–";
      minimizeBtn.title = minimized ? "放大" : "縮小";
      widget.style.padding = minimized ? "6px 30px 6px 12px" : "10px 16px 10px";
      widget.style.minWidth = minimized ? "0" : "120px";
    });

    let toggle = widget.querySelector("#tikitikiAutoClickToggle");
    toggle.checked = items[settingKey];
    toggle.addEventListener("change", async () => {
      const enabled = toggle.checked;
      toggle.disabled = true;
      try {
        await chrome.storage.local.set({ [settingKey]: enabled });
        if (enabled && onToggleOn) onToggleOn();
      } catch (error) {
        toggle.checked = !enabled;
        console.error('TikiTiki: 無法儲存自動點擊設定', error);
      } finally {
        toggle.disabled = false;
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[settingKey]) toggle.checked = changes[settingKey].newValue ?? false;
      if (area === 'local' && changes[orderKey]) showPriority(changes[orderKey].newValue ?? defaultOrder);
    });
  });
}
