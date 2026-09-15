const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/ibon/ibon.js'), 'utf8');
function control(extra = {}) {
  return { disabled: false, checked: false, clicks: 0, events: [],
    click() { this.clicks++; this.checked = !this.checked; }, focus() {},
    dispatchEvent(event) { this.events.push(event.type); }, ...extra };
}
async function page(path, settings = {}, areas = [], selects = [], separated = control(), computer = control({ checked: true })) {
  let tick, change;
  const context = vm.createContext({ console, Event,
    location: { pathname: '/application/UTK02/' + path },
    document: {
      querySelectorAll: () => selects,
      getElementById: id => id === 'AreaTable' ? { children: [{}], querySelectorAll: () => [] } : id.endsWith('BUY_TYPE_2') ? computer : separated
    },
    setInterval(fn) { tick = fn; }, addClockWidget(callback, key) { assert.equal(key, 'IbonAutoSelect'); },
    chrome: { dom: { openOrClosedShadowRoot: () => ({ querySelectorAll: () => areas }) }, storage: { local: { async get(defaults) { return { ...defaults, ...settings }; } },
      onChanged: { addListener(fn) { change = fn; } } } }
  });
  vm.runInContext(source, context);
  await Promise.resolve();
  return { tick, change, separated, computer };
}
function area(name, remaining) {
  return control({ textContent: `${name} 4880 ${remaining ? '熱賣中' : '已售完'}`,
    classList: { contains: () => remaining === 0 }, querySelector: () => ({ textContent: name }) });
}
(async () => {
  const areas = [area('VIP', 0), area('A1', 20), area('B1', 30)];
  const p = await page('UTK0201_000.aspx', { IbonAutoSelect: true, IbonAreaName: 'VIP,B1,A1' }, areas);
  assert.equal(areas[2].clicks, 1);
  p.tick();
  assert.equal(areas[2].clicks, 1, 'only click one area once');
  const off = area('A1', 20);
  await page('UTK0201_000.aspx', { IbonAreaName: 'A1' }, [off]);
  await page('UTK0201_000.aspx', { IbonAutoSelect: true }, [off]);
  assert.equal(off.clicks, 0, 'off or empty scope does not select an area');
  const radio = control(), targetArea = area('B1', 20);
  const mode = await page('UTK0201_000.aspx', { IbonAutoSelect: true, IbonAreaName: 'B1' }, [targetArea], [], control(), radio);
  assert.equal(radio.clicks, 1);
  assert.equal(targetArea.clicks, 0, 'wait for computer allocation mode');
  mode.tick();
  assert.equal(targetArea.clicks, 1);
  const select = control({ value: '0', options: ['0', '1', '2', '3', '4'].map(value => ({ value })) });
  const q = await page('UTK0201_001.aspx', { IbonAutoSelect: true, IbonAllowSeparated: true }, [], [select]);
  assert.equal(q.separated.clicks, 1);
  q.tick();
  assert.equal(select.value, '2');
  assert.deepEqual(select.events, ['input', 'change']);
  select.value = '1';
  q.tick();
  assert.equal(select.value, '1', 'do not override later manual changes');
  q.change({ IbonTicketNumber: { newValue: '0' } }, 'local');
  assert.equal(select.value, '4');
  q.change({ IbonAllowSeparated: { newValue: false } }, 'local');
  assert.equal(q.separated.checked, false);
  const invalid = control({ value: '0', options: [{ value: '0' }, { value: '5' }] });
  await page('UTK0201_001.aspx', { IbonAutoSelect: true }, [], [invalid]);
  assert.equal(invalid.value, '0', 'never overshoot the requested quantity');
  await page('UTK0201_001.aspx', { IbonAutoSelect: true, IbonTicketNumber: '0' }, [], [invalid]);
  assert.equal(invalid.value, '5', 'max uses website limit, not a hardcoded four');
  const multiple = control({ value: '0', options: [{ value: '2' }] });
  await page('UTK0201_001.aspx', { IbonAutoSelect: true }, [], [multiple, multiple]);
  assert.equal(multiple.value, '0', 'ambiguous ticket types remain manual');
  console.log('ibon selection checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
