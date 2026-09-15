// Run: node tests/widget.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/widget.js'), 'utf8');

(async () => {
  for (const key of ['AutoClickArea', 'KktixAutoSelect']) {
    const elements = new Map();
    function element(id) {
      if (!elements.has(id)) elements.set(id, {
        style: {}, addEventListener(type, handler) { this[type] = handler; },
        querySelector: element,
        getBoundingClientRect() { return { left: parseFloat(this.style.left) || 600, top: parseFloat(this.style.top) || 14, width: 180, height: 120 }; },
        setPointerCapture(id) { this.capture = id; },
        hasPointerCapture(id) { return this.capture === id; },
        releasePointerCapture() { this.capture = null; }
      });
      return elements.get(id);
    }
    const stored = { AutoClickArea: false, KktixAutoSelect: false };
    let listener, tick, callbacks = 0, loginState = false;
    const context = vm.createContext({
      console, Date,
      getTikitikiLoginState: () => { assert.equal(key, 'AutoClickArea'); return loginState; },
      window: { innerWidth: 800, innerHeight: 600, addEventListener() {} },
      setInterval(fn, delay) { assert.equal(delay, 1000); tick = fn; },
      document: { getElementById: () => null, createElement: element,
        head: { appendChild() {} }, body: { appendChild() {} } },
      chrome: { runtime: { sendMessage(message) {
        assert.equal(message.tikitikiOpenOptions, true);
        assert.equal(message.platform, key === 'AutoClickArea' ? 'tixcraft' : 'kktix');
      } }, storage: {
        local: {
          get(defaults, callback) { callback({ ...defaults, ...stored }); },
          async set(values) {
            Object.assign(stored, values);
            listener({ [key]: { newValue: stored[key] } }, 'local');
          }
        },
        onChanged: { addListener(fn) { listener = fn; } }
      } }
    });
    vm.runInContext(source, context);
    if (key === 'AutoClickArea') context.addClockWidget(() => callbacks++);
    else context.addClockWidget(undefined, key);
    const toggle = element('#tikitikiAutoClickToggle');
    element('#tikitikiSettings').click();
    const warning = element('#tikitikiLoginWarning');
    if (key === 'AutoClickArea') assert.match(warning.textContent, /尚未登入/);
    else assert.equal(warning.textContent, undefined, 'KKTIX does not display login status');
    loginState = true;
    tick();
    if (key === 'AutoClickArea') assert.equal(warning.style.display, 'none');
    loginState = false;
    tick();
    const orderKey = key === 'KktixAutoSelect' ? 'KktixTieBreak' : 'AutoClickTieBreak';
    assert.match(element('#tikitikiPriority').textContent, /優先：/);
    listener({ [orderKey]: { newValue: 'bottom' } }, 'local');
    assert.equal(element('#tikitikiPriority').textContent, '優先：畫面順序（由下到上）');
    listener({ [orderKey]: { newValue: 'remaining' } }, 'local');
    assert.equal(element('#tikitikiPriority').textContent, key === 'KktixAutoSelect' ? '優先：票種上限最多' : '優先：剩餘票數最多');
    toggle.checked = true;
    await toggle.change();
    assert.equal(stored[key], true);
    assert.equal(stored[key === 'AutoClickArea' ? 'KktixAutoSelect' : 'AutoClickArea'], false);
    assert.equal(callbacks, key === 'AutoClickArea' ? 1 : 0);
    listener({ [key]: { newValue: false } }, 'local');
    assert.equal(toggle.checked, false, 'settings changes sync to widget');
    tick();
    assert.match(element('#tikitikiClock').textContent, /\d{2}:\d{2}:\d{2}/);
    element('#tikitikiMinimize').click();
    assert.equal(element('#tikitikiToggleRow').style.display, 'none');
    assert.equal(element('#tikitikiPriority').style.display, 'none');
    if (key === 'AutoClickArea') assert.equal(warning.style.display, 'block', 'login warning remains visible when minimized');
    element('#tikitikiMinimize').click();
    assert.equal(element('#tikitikiToggleRow').style.display, '');
    const clock = element('#tikitikiClock'), widget = element('div');
    clock.pointerdown({ button: 0, pointerId: 1, clientX: 620, clientY: 24, preventDefault() {} });
    clock.pointermove({ pointerId: 1, clientX: 120, clientY: 210 });
    assert.equal(widget.style.left, '100px');
    assert.equal(widget.style.top, '200px');
    clock.pointermove({ pointerId: 1, clientX: 1000, clientY: -10 });
    assert.equal(widget.style.left, '620px');
    assert.equal(widget.style.top, '0px');
    clock.pointercancel({ pointerId: 1 });
    clock.pointermove({ pointerId: 1, clientX: 100, clientY: 100 });
    assert.equal(widget.style.left, '620px', 'cancel stops dragging');
    assert.equal(clock.capture, null);
    assert.equal(callbacks, key === 'AutoClickArea' ? 1 : 0, 'drag does not trigger auto-click');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
  const scripts = manifest.content_scripts.find(entry => entry.js.includes('js/kktix/kktix.js')).js;
  assert.ok(scripts.indexOf('js/widget.js') < scripts.indexOf('js/kktix/kktix.js'));
  console.log('Widget checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
