const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/myvideo/activity.js'), 'utf8');

function setup(signupActivity) {
  const button = { setAttribute(key, value) { this[key] = value; }, addEventListener(type, fn) { this[type] = fn; } };
  const status = {};
  const interval = { value: '3000', addEventListener(type, fn) { this[type] = fn; } };
  const delays = [];
  const clock = {};
  let clockTick;
  let now = new Date(2026, 9, 16, 9, 5, 7);
  let host, tick, pagehide, clears = 0;
  const context = vm.createContext({
    Date: class extends Date { constructor() { super(now); } },
    window: { signupActivity, addEventListener(type, fn) { if (type === 'pagehide') pagehide = fn; } },
    document: {
      getElementById: () => host,
      createElement: () => ({ style: {}, attachShadow: () => ({ querySelector: selector => selector === 'button' ? button : selector === 'input' ? interval : selector === 'time' ? clock : status }) }),
      body: { appendChild(node) { host = node; } }
    },
    setInterval(fn, delay) { if (delay === 1000) { clockTick = fn; return 2; } delays.push(delay); tick = fn; return 1; },
    clearInterval() { clears++; }
  });
  vm.runInContext(source, context);
  return { button, status, interval, delays, clock, clockTick: () => clockTick(), setTime(value) { now = value; }, tick: () => tick(), hide: () => pagehide(), clears: () => clears, context };
}

test('MyVideo starts manually, repeats at 3 seconds, stops and restarts', async () => {
  let calls = 0;
  const ui = setup(() => { calls++; });
  assert.equal(calls, 0);
  ui.button.click();
  assert.equal(calls, 0, 'first call waits 3 seconds');
  assert.equal(ui.button['aria-pressed'], 'true');
  await ui.tick();
  await ui.tick();
  assert.equal(calls, 2);
  assert.match(ui.status.textContent, /2 次/);
  ui.button.click();
  assert.equal(ui.clears(), 1);
  assert.equal(ui.status.textContent, '已停止');
  ui.button.click();
  await ui.tick();
  assert.match(ui.status.textContent, /1 次/);
  ui.hide();
  assert.equal(ui.button['aria-pressed'], 'false');
  vm.runInContext(source, ui.context);
  assert.equal(ui.clears(), 3, 'duplicate injection does nothing');
});

test('MyVideo stops on missing function and thrown or rejected calls', async () => {
  for (const fn of [undefined, () => { throw Error('failed'); }, () => Promise.reject(Error('failed'))]) {
    const ui = setup(fn);
    ui.button.click();
    await ui.tick();
    assert.equal(ui.button['aria-pressed'], 'false');
    assert.equal(ui.clears(), 1);
    assert.match(ui.status.textContent, /稍後重試|已停止/);
  }
});

test('MyVideo loads independently in MAIN world for variable activity URLs', () => {
  const manifest = require('../manifest.json');
  const entry = manifest.content_scripts.find(item => item.js.includes('js/myvideo/activity.js'));
  assert.equal(entry.world, 'MAIN');
  assert.deepEqual(entry.js, ['js/myvideo/activity.js']);
  assert.deepEqual(entry.matches, ['https://www.myvideo.net.tw/activity/*']);
});

test('MyVideo interval supports integer milliseconds, clamps minimum and updates the running timer', () => {
  const ui = setup(() => {});
  ui.button.click();
  assert.deepEqual(ui.delays, [3000]);
  for (const [value, expected] of [['1231', 1231], ['499', 500], ['501', 501], ['1236.7', 1237], ['invalid', 1237], ['', 500], ['2147483648', 2147483647]]) {
    ui.interval.value = value;
    ui.interval.change();
    assert.equal(ui.delays.at(-1), expected);
    assert.equal(ui.interval.value, String(expected));
    assert.equal(ui.button['aria-pressed'], 'true');
  }
  ui.button.click();
  const length = ui.delays.length;
  ui.interval.value = '2011';
  ui.interval.change();
  assert.equal(ui.delays.length, length, 'editing while stopped does not start');
  ui.button.click();
  assert.equal(ui.delays.at(-1), 2011);
});

test('MyVideo clock shows local hours, minutes and seconds, independently of signup', () => {
  const ui = setup(() => {});
  assert.equal(ui.clock.textContent, '09:05:07');
  ui.setTime(new Date(2026, 9, 16, 10, 0, 1));
  ui.clockTick();
  assert.equal(ui.clock.textContent, '10:00:01');
  assert.deepEqual(ui.delays, [], 'clock does not start signup');
  ui.button.click();
  ui.button.click();
  ui.setTime(new Date(2026, 9, 16, 10, 0, 2));
  ui.clockTick();
  assert.equal(ui.clock.textContent, '10:00:02', 'stopping signup keeps clock running');
});
