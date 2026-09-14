// Run: node tests/widget.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/tixcraft/widget.js'), 'utf8');

(async () => {
  for (const key of ['AutoClickArea', 'KktixAutoSelect']) {
    const elements = new Map();
    function element(id) {
      if (!elements.has(id)) elements.set(id, {
        style: {}, addEventListener(type, handler) { this[type] = handler; },
        querySelector: element
      });
      return elements.get(id);
    }
    const stored = { AutoClickArea: false, KktixAutoSelect: false };
    let listener, tick, callbacks = 0;
    const context = vm.createContext({
      console, Date,
      setInterval(fn, delay) { assert.equal(delay, 1000); tick = fn; },
      document: { getElementById: () => null, createElement: element,
        head: { appendChild() {} }, body: { appendChild() {} } },
      chrome: { storage: {
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
    element('#tikitikiMinimize').click();
    assert.equal(element('#tikitikiToggleRow').style.display, '');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
  const scripts = manifest.content_scripts.find(entry => entry.js.includes('js/kktix/kktix.js')).js;
  assert.ok(scripts.indexOf('js/tixcraft/widget.js') < scripts.indexOf('js/kktix/kktix.js'));
  console.log('Widget checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
