(() => {
  if (document.getElementById('tikitiki-myvideo')) return;

  const host = document.createElement('div');
  host.id = 'tikitiki-myvideo';
  host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:calc(100vw - 32px)';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      section { box-sizing:border-box;width:148px;max-width:calc(100vw - 32px);padding:12px;border:1px solid #dce2e8;border-radius:12px;background:#fff;color:#243041;box-shadow:0 4px 18px #15223524;font:13px/1.5 system-ui,sans-serif; }
      header { margin-bottom:8px;font-weight:700; }
      time { display:block;margin-bottom:12px;color:#243041;font-size:23px;font-weight:600;line-height:1.3;letter-spacing:.3px;font-variant-numeric:tabular-nums; }
      .controls { display:flex;flex-direction:column;gap:8px; }
      label { display:flex;flex-direction:column;gap:4px;width:100%;color:#526074;font-size:12px; }
      input { box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:6px;border:1px solid #c6ced8;border-radius:7px;background:#f8fafc;color:#243041;font:inherit;font-variant-numeric:tabular-nums; }
      button { width:100%;min-height:44px;padding:6px 12px;border:0;border-radius:7px;background:#176e64;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer; }
      button[aria-pressed="true"] { background:#aa3535; }
      button:hover { filter:brightness(1.08); }
      :is(button,input):focus-visible { outline:2px solid #176e64;outline-offset:2px; }
      output { display:block;margin-top:8px;color:#526074;font-size:12px;overflow-wrap:anywhere; }
    </style>
    <section aria-label="MyVideo 活動小工具">
      <header>MyVideo 報名</header>
      <time aria-label="目前時間"></time>
      <div class="controls">
        <label>間隔（ms）<input aria-label="報名間隔毫秒" type="number" min="500" max="2147483647" step="1" value="3000"></label>
        <button type="button" aria-pressed="false">開始</button>
      </div>
      <output role="status">已停止 · 每 3000 ms</output>
    </section>`;
  const button = root.querySelector('button');
  const status = root.querySelector('output');
  const interval = root.querySelector('input');
  const clock = root.querySelector('time');
  function updateClock() {
    const now = new Date();
    clock.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(value => String(value).padStart(2, '0')).join(':');
  }
  updateClock();
  let clockTimer = setInterval(updateClock, 1000);
  let milliseconds = 3000;
  let timer = null;
  let count = 0;

  function stop(message = '已停止') {
    clearInterval(timer);
    timer = null;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '開始';
    status.textContent = message;
  }

  async function signup() {
    try {
      if (typeof window.signupActivity !== 'function') {
        stop('此頁尚未提供報名功能，請稍後重試');
        return;
      }
      await window.signupActivity();
      count++;
      if (timer !== null) status.textContent = `執行中 · 已觸發 ${count} 次`;
    } catch {
      stop('報名觸發失敗，已停止；請確認頁面後重試');
    }
  }

  button.addEventListener('click', () => {
    if (timer !== null) {
      stop();
      return;
    }
    count = 0;
    timer = setInterval(signup, milliseconds);
    button.setAttribute('aria-pressed', 'true');
    button.textContent = '停止';
    status.textContent = `執行中 · 每 ${milliseconds} ms`;
  });
  interval.addEventListener('change', () => {
    const value = Number(interval.value);
    milliseconds = Number.isFinite(value) ? Math.min(2147483647, Math.max(500, Math.round(value))) : milliseconds;
    interval.value = String(milliseconds);
    if (timer !== null) {
      clearInterval(timer);
      timer = setInterval(signup, milliseconds);
      status.textContent = `執行中 · 每 ${milliseconds} ms`;
    } else {
      status.textContent = `已停止 · 每 ${milliseconds} ms`;
    }
  });
  window.addEventListener('pagehide', () => {
    stop();
    clearInterval(clockTimer);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      updateClock();
      clockTimer = setInterval(updateClock, 1000);
    }
  });
  document.body.appendChild(host);
})();
