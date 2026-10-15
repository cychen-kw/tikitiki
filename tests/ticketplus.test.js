const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/ticketplus/ticketplus.js'), 'utf8');

// Name column: own text plus room for the ＋ button.
function nameCell(name) {
  return { childNodes: [{ nodeType: 3, textContent: ' ' + name + ' ' }], toggle: null,
    querySelector() { return this.toggle; }, appendChild(button) { this.toggle = button; } };
}

function visibility() {
  return { hidden: false, toggle(name, value) { this.hidden = value; } };
}

// One area panel: header + content rows with − / count / +, like the site's Vuetify accordion.
function area(name, price, header = '熱賣中', max = 4, rows = [['全票', price]]) {
  const panel = { active: false, clicks: { plus: 0, minus: 0, header: 0 } };
  panel.rows = rows.map(([type, rowPrice]) => {
    const value = { textContent: '0' };
    const plus = { get disabled() { return Number(value.textContent) >= max; },
      click() { if (!this.disabled) { panel.clicks.plus++; value.textContent = String(Number(value.textContent) + 1); } } };
    const minus = { click() { panel.clicks.minus++; value.textContent = String(Math.max(0, Number(value.textContent) - 1)); } };
    plus.closest = () => plus;
    minus.closest = () => minus;
    const count = { children: [minus, value, plus],
      querySelector: sel => sel === '.mdi-plus' ? plus : sel === '.mdi-minus' ? minus : null };
    const ticketPrice = { previousElementSibling: nameCell(type) };
    const row = { value, count, ticketPrice, textContent: type + ' NT. ' + rowPrice.toLocaleString(),
      nameCell: ticketPrice.previousElementSibling, classList: visibility(), matches: sel => sel === '.soldout' && row.soldout === true,
      closest: sel => ['.v-expansion-panel', '.seats-area', '.seats-area > .v-expansion-panel'].includes(sel) ? panel : null,
      querySelector: sel => sel === '.count-button' ? count : sel === '.ticket-price' ? ticketPrice : null };
    count.closest = () => row;
    ticketPrice.closest = () => row;
    return row;
  });
  const head = { disabled: false, textContent: `${name} ${header} NT.${price.toLocaleString()}`,
    click() { panel.clicks.header++; panels.forEach(p => { p.active = p === panel; p.rows.forEach(r => { r.value.textContent = '0'; }); }); } };
  panel.nameCell = nameCell(name);
  Object.assign(panel, {
    matches: sel => sel === '.v-expansion-panel',
    closest: () => panel,
    classList: { ...visibility(), contains: cls => cls === 'v-expansion-panel--active' && panel.active },
    querySelector: sel => sel === '.v-expansion-panel-header' ? head :
      sel === '.v-expansion-panel-header .row' ? { firstElementChild: panel.nameCell } : null,
    count: () => panel.rows.map(r => Number(r.value.textContent))
  });
  return panel;
}
let panels, flat = [];

// Ticket-type page: flat rows, sold-out rows have no count button.
function ticketRow(type, price, max = 4) {
  const p = area('', price, '', max, [[type, price]]);
  const row = p.rows[0];
  row.closest = () => null;
  row.firstElementChild = row.nameCell;
  row.querySelector = sel => sel === '.count-button' ? row.count : null;
  return { row, count: () => Number(row.value.textContent), clicks: p.clicks, toggle: () => row.nameCell.toggle };
}

const flush = () => new Promise(resolve => setTimeout(resolve));
async function page(settings, list, serialInputs = [], focusedInput = null, AudioContext) {
  panels = list;
  let tick, change, click, inputHandler, pointerdown;
  const stored = { ...settings };
  let random = 0;
  const math = Object.create(Math);
  math.random = () => random;
  const countdown = { textContent: '' };
  const nextStatus = { textContent: '' };
  const nextButton = { textContent: '下一步', disabled: false, clicks: 0, getClientRects: () => [1], click() { this.clicks++; } };
  const refreshButton = { textContent: '更新票數', disabled: false, clicks: 0, click() { this.clicks++; } };
  const context = vm.createContext({ console, Date, Event, AudioContext, URL, Math: math,
    location: { pathname: '/order/abc/def', href: 'https://ticketplus.com.tw/order/abc/def' },
    document: { activeElement: focusedInput, getElementById: id => id === 'tikitikiNextStatus' ? nextStatus : countdown, title: '票區一覽 | 測試活動 | Ticket Plus遠大售票系統',
      querySelectorAll: sel => sel === 'input[placeholder*="購票序號"]' ? serialInputs : sel === 'button' ? [refreshButton, nextButton] : sel === '.count-button' ? [...panels.filter(p => p.active).flatMap(p => p.rows), ...flat].map(r => r.count) :
        sel === '.seats-area > .v-expansion-panel' ? panels :
        sel === '.seats-area .ticket-price' ? panels.filter(p => p.active).flatMap(p => p.rows).map(r => r.ticketPrice) : flat,
      createElement: () => ({ style: {}, setAttribute() {}, addEventListener(type, fn) { this.onclick = fn; } }),
      addEventListener(type, fn) { if (type === 'click') click = fn; else if (type === 'input') inputHandler = fn; else if (type === 'pointerdown') pointerdown = fn; } },
    setInterval(fn) { tick = fn; }, addClockWidget(callback, key) { assert.equal(key, 'TicketplusAutoSelect'); },
    chrome: { storage: { local: { async get(defaults) { return { ...defaults, ...stored }; },
      async set(updates) {
        const changes = Object.fromEntries(Object.entries(updates).map(([key, newValue]) => [key, { newValue }]));
        Object.assign(stored, updates);
        change(changes, 'local');
      } },
      onChanged: { addListener(fn) { change = fn; } } } }
  });
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/sound.js'), 'utf8'), context);
  vm.runInContext(source, context);
  await flush();
  tick();
  await flush();
  const run = (n = 10) => { for (let i = 0; i < n; i++) tick(); };
  const press = async toggle => { await toggle.onclick({ preventDefault() {}, stopPropagation() {} }); };
  return { run, change, click, stored, press, countdown, nextStatus, refreshButton, nextButton, unlockAudio: () => pointerdown(), input: event => inputHandler(event),
    refresh(now, value = 0) { random = value; context.ticketplusRefresh(now); },
    resetRefresh() { vm.runInContext("ticketplusNextRefresh = 0", context); } };
}

(async () => {
  let list = [area('VIP1', 5480), area('A1', 4880), area('A2', 4880)];
  let p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '4880', TicketplusTicketNumber: '2' }, list);
  p.run();
  assert.deepEqual(list[1].count(), [2], 'first area with the price, by + clicks');
  assert.equal(list[1].clicks.plus, 2);
  assert.equal(list[0].clicks.header + list[2].clicks.header, 0);

  list = [area('VIP1', 5480, '剩餘 1'), area('VIP2', 5480, '剩餘 7', 1), area('A1', 4880)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '5480,4880', TicketplusTicketNumber: '2' }, list);
  p.run(20);
  assert.equal(list[0].clicks.header, 0, 'skip areas with too few remaining');
  assert.deepEqual(list[1].count(), [0], 'reset an area that cannot reach the target');
  assert.deepEqual(list[2].count(), [2], 'fall back to the next price');

  const pairRow = ticketRow('預售雙人', 900);
  const pairPlus = pairRow.row.count.children[2];
  pairPlus.click = function () { if (!this.disabled) pairRow.row.value.textContent = String(Number(pairRow.row.value.textContent) + 2); };
  flat = [pairRow.row];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '900', TicketplusTicketNumber: '1' }, []);
  p.run(20);
  assert.equal(pairRow.count(), 2, 'paired tickets that jump past the target stay at 2');
  assert.equal(pairRow.clicks.minus, 0, 'no back-and-forth between 2 and 0');
  flat = [];

  list = [area('B1', 3880, '熱賣中', 6)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '3880', TicketplusTicketNumber: '0' }, list);
  p.run();
  assert.deepEqual(list[0].count(), [6], 'max follows the site, not four');

  list = [area('C1', 2000, '熱賣中', 4, [['身障票', 2000], ['全票', 2000]]), area('輪椅席', 2000)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '2000' }, list);
  p.run();
  assert.deepEqual(list[0].count(), [0, 2], 'skip disability ticket rows');
  assert.equal(list[1].clicks.header, 0, 'skip disability areas');

  list = [area('A1', 4880)];
  p = await page({ TicketplusPrice: '4880' }, list);
  p.run();
  assert.equal(list[0].clicks.header, 0, 'off does nothing');
  p = await page({ TicketplusAutoSelect: true }, list);
  p.run();
  assert.deepEqual(list[0].count(), [2], 'no list or price allows all areas');

  list = [area('A1', 4880)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '4880', TicketplusTicketNumber: '4' }, list);
  p.run(2);
  p.click({ isTrusted: true, target: { closest: sel => sel === '.tikitiki-ticket-scope' ? null : {} } });
  p.run();
  assert.ok(list[0].count()[0] < 4, 'stop after a manual click');
  list = [area('A1', 4880)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '4880', TicketplusTicketNumber: '2' }, list);
  p.run();
  list[0].rows[0].value.textContent = '0'; // 清除選擇 without 更新票數
  p.run();
  assert.deepEqual(list[0].count(), [0], 'do not refill after the user clears the selection');
  list[0].rows[0].value.textContent = '2';
  p.click({ isTrusted: true, target: { closest: sel => sel === 'button' ? { textContent: ' 更新票數 ' } : null } });
  p.run();
  assert.deepEqual(list[0].count(), [2], 'keep the selection until the site clears it');
  list[0].rows[0].value.textContent = '0'; // the site clears counts after its refresh request
  p.run();
  assert.deepEqual(list[0].count(), [2], 'select again after 更新票數 clears the counts');
  p.click({ isTrusted: true, target: { closest: sel => sel === 'button' ? { textContent: ' 更新票數 ' } : null } });
  p.click({ isTrusted: true, target: { closest: sel => sel === 'button' ? { textContent: ' 清除選擇 ' } : null } });
  list[0].rows[0].value.textContent = '0';
  p.run();
  assert.deepEqual(list[0].count(), [0], '清除選擇 is a manual choice even after 更新票數');

  list = [area('輪椅席', 800), area('A1', 2000), area('A2', 3000)];
  list[2].active = true;
  p = await page({ TicketplusAutoSelect: true }, list);
  p.run();
  assert.deepEqual(list.map(a => a.count()), [[0], [2], [0]], 'all areas follow page order and skip disability areas by default');
  list = [area('輪椅席', 800), area('A1', 2000)];
  p = await page({ TicketplusAutoSelect: true, TicketplusIgnoreDisabledArea: false }, list);
  p.run();
  assert.deepEqual(list[0].count(), [2], 'disabling ignore includes disability areas');
  list = [area('A1', 2000, '熱賣中', 4, [['身心障礙票', 2000], ['全票', 2000]])];
  p = await page({ TicketplusAutoSelect: true, 'TicketplusTicketScope:abc': ['A1 / 身心障礙票'] }, list);
  p.run();
  assert.deepEqual(list[0].count(), [0, 0], 'ignore applies to saved disability tickets too');
  p.change({ TicketplusIgnoreDisabledArea: { newValue: false } }, 'local');
  p.run();
  assert.deepEqual(list[0].count(), [2, 0], 'ignore setting synchronizes immediately');
  const allFlat = ticketRow('全票', 1800);
  flat = [allFlat.row];
  p = await page({ TicketplusAutoSelect: true }, []);
  p.run();
  assert.equal(allFlat.count(), 2, 'all-area fallback also works on flat ticket pages');
  flat = [];

  const single = ticketRow('單人預售票', 650, 1), presale = ticketRow('雙人預售票', 650);
  flat = [single.row, presale.row];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '325,650', TicketplusTicketNumber: '2' }, []);
  p.run(20);
  assert.equal(single.count(), 0, 'ticket-type page: clear a row that cannot reach the target');
  assert.equal(presale.count(), 2, 'ticket-type page: + clicks on the next row with the price');
  flat = [];

  // Added tickets replace the price list, in the order they were added; tickets inside an
  // area get their ＋ once the area is open and are saved as "area / ticket".
  list = [area('VIP1', 5480), area('A1', 4880, '熱賣中', 4, [['全票+加購福利', 4880], ['全票', 4880]]), area('輪椅席', 4880)];
  p = await page({ TicketplusTicketNumber: '2' }, list);
  assert.equal(list[1].rows[1].nameCell.toggle, null, 'closed areas show no ＋ yet');
  list[1].querySelector('.v-expansion-panel-header').click();
  p.run(1);
  assert.equal(list[1].nameCell.toggle, null, 'no ＋ on the area header');
  assert.equal(list[1].rows[1].nameCell.toggle.textContent, '＋');
  await p.press(list[1].rows[1].nameCell.toggle);
  assert.deepEqual(Array.from(p.stored['TicketplusTicketScope:abc']), ['A1 / 全票']);
  assert.deepEqual(JSON.parse(JSON.stringify(p.stored['TicketplusTicketInfo:abc:A1 / 全票'])),
    { eventName: '測試活動', ticketName: 'A1 / 全票', url: 'https://ticketplus.com.tw/order/abc/def' });
  p.run(1);
  assert.equal(list[1].rows[1].nameCell.toggle.textContent, '✓ 1');
  list[2].querySelector('.v-expansion-panel-header').click();
  p.run(1);
  assert.equal(list[2].rows[0].nameCell.toggle.textContent, '＋', 'disability tickets can be saved independently of filtering');

  list = [area('VIP1', 5480), area('A1', 4880, '熱賣中', 4, [['全票+加購福利', 4880], ['全票', 4880]]), area('A2', 4880)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '5480', 'TicketplusTicketScope:abc': ['A1 / 全票', 'A2 / 全票'] }, list);
  p.run();
  assert.deepEqual(list.map(a => a.count()), [[0], [0, 2], [0]], 'open the added area and pick the added ticket, not the first one');
  assert.equal(list[0].clicks.header, 0, 'added tickets win over the price list');

  list = [area('A1', 4880), area('A2', 5480)];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '4880', 'TicketplusTicketScope:abc': ['A2 / 全票'] }, list);
  p.run(1);
  await p.press(list[1].rows[0].nameCell.toggle);
  assert.deepEqual(Array.from(p.stored['TicketplusTicketScope:abc']), [], 'press again to remove');
  p.run();
  assert.deepEqual(list[0].count(), [2], 'an empty list falls back to prices');

  const general = ticketRow('單人預售票', 650), pair = ticketRow('雙人套票', 1300);
  flat = [general.row, pair.row];
  p = await page({ TicketplusAutoSelect: true, 'TicketplusTicketScope:abc': ['雙人套票'] }, []);
  p.run();
  assert.equal(pair.toggle().textContent, '✓ 1');
  assert.deepEqual([general.count(), pair.count()], [0, 2], 'ticket-type page uses the added ticket name');
  flat = [];
  list = [area('A1', 800, '剩餘 0'), area('A2', 800, '剩餘 10')];
  list[0].active = true;
  const sold = list[0].rows[0];
  sold.soldout = true;
  sold.textContent += ' 暫無票券';
  p = await page({}, list);
  assert.equal(list[0].classList.hidden, false, 'sold-out areas stay visible by default');
  assert.match(sold.nameCell.toggle.style.cssText, /pointer-events:auto/, 'scope button overrides inherited pointer-events:none');
  await p.press(sold.nameCell.toggle);
  assert.deepEqual(Array.from(p.stored['TicketplusTicketScope:abc']), ['A1 / 全票'], 'sold-out tickets can still be added');
  p.change({ TicketplusHideSoldOut: { newValue: true } }, 'local');
  assert.equal(list[0].classList.hidden, true);
  assert.equal(sold.classList.hidden, true);
  assert.equal(list[1].classList.hidden, false, 'remaining 10 is not remaining 0');
  p.run();
  assert.equal(list[0].classList.hidden, true, 'decoration never unhides sold-out areas');
  p.change({ TicketplusHideSoldOut: { newValue: false } }, 'local');
  assert.equal(list[0].classList.hidden, false, 'turning hiding off restores areas');
  assert.equal(sold.classList.hidden, false);
  p.change({ TicketplusHideSoldOut: { newValue: true } }, 'local');
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 2 NT.800';
  sold.soldout = false;
  sold.textContent = '全票 NT.800';
  p.run();
  assert.equal(list[0].classList.hidden, false, 'released tickets become visible');
  assert.equal(sold.classList.hidden, false);
  assert.deepEqual(Array.from(p.stored['TicketplusTicketScope:abc']), ['A1 / 全票'], 'hiding preserves the list');

  const soldFlat = ticketRow('全票', 800);
  soldFlat.row.soldout = true;
  soldFlat.row.textContent += ' 暫無票券';
  flat = [soldFlat.row];
  p = await page({ TicketplusHideSoldOut: true, TicketplusAutoSelect: true, TicketplusPrice: '800', TicketplusTicketNumber: '0' }, []);
  p.run();
  assert.equal(soldFlat.row.classList.hidden, true, 'flat sold-out tickets are hidden too');
  assert.equal(soldFlat.count(), 0, 'max selection skips sold-out rows');
  flat = [];
  p = await page({ TicketplusAutoSelect: true }, []);
  p.resetRefresh();
  p.refresh(1000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒');
  p.refresh(4999);
  assert.equal(p.refreshButton.clicks, 0, 'never refresh before the deadline');
  p.refresh(5000, 0.999);
  assert.equal(p.refreshButton.clicks, 1);
  assert.equal(p.countdown.textContent, '更新票數：8 秒', 'draw a new 4–8 second interval after each click');
  p.refresh(13000, 0.5);
  assert.equal(p.refreshButton.clicks, 2);
  assert.equal(p.countdown.textContent, '更新票數：6 秒');
  p.refreshButton.disabled = true;
  p.refresh(40000);
  assert.equal(p.refreshButton.clicks, 2, 'disabled refresh buttons are not clicked');
  p.refreshButton.disabled = false;
  p.refresh(40000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒', 'restart the timer once the button is available');
  p.change({ TicketplusAutoSelect: { newValue: false } }, 'local');
  p.refresh(60000);
  assert.equal(p.countdown.textContent, '自動更新已關閉');
  assert.equal(p.refreshButton.clicks, 2);
  p.change({ TicketplusAutoSelect: { newValue: true } }, 'local');
  p.refresh(60000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒');
  p.click({ isTrusted: true, target: { closest: sel => sel === 'button' ? { textContent: '更新票數' } : null } });
  p.refresh(65000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒', 'manual refresh restarts the countdown');
  p.click({ isTrusted: true, target: { closest: sel => sel === '.seats-area, .count-button' ? {} : null } });
  p.refresh(90000);
  assert.equal(p.countdown.textContent, '自動更新已暫停', 'manual takeover stops auto refresh');
  assert.equal(p.refreshButton.clicks, 2);
  list = [area('A1', 800, '剩餘 0')];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '9999' }, list);
  p.resetRefresh();
  p.refresh(1000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒');
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 1 NT.800';
  p.refresh(5000);
  assert.equal(p.refreshButton.clicks, 0, 'stock appearing at the deadline prevents refresh even before selection');
  assert.equal(p.countdown.textContent, '偵測到有票，暫停更新');
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 0 NT.800';
  p.refresh(5000);
  assert.equal(p.countdown.textContent, '更新票數：4 秒', 'restart a full countdown when stock disappears');
  p.refresh(9000);
  assert.equal(p.refreshButton.clicks, 1);
  const availableFlat = ticketRow('全票', 800);
  flat = [availableFlat.row];
  p = await page({ TicketplusAutoSelect: true, TicketplusPrice: '9999' }, []);
  p.refresh(1000);
  p.refresh(10000);
  assert.equal(p.refreshButton.clicks, 0, 'flat ticket pages pause on an enabled quantity button');
  assert.equal(p.countdown.textContent, '偵測到有票，暫停更新');
  flat = [];
  const held = ticketRow('全票', 800);
  flat = [held.row];
  p = await page({ TicketplusAutoSelect: true }, []);
  p.run();
  p.refresh(1000);
  p.refresh(30000);
  assert.equal(p.countdown.textContent, '自動更新已暫停');
  assert.equal(p.refreshButton.clicks, 0, 'never clear selected tickets by refreshing');
  flat = [];
  function serialInput(overrides = {}) {
    return { value: '', events: [], getClientRects: () => [1],
      dispatchEvent(event) { this.events.push([event.type, event.bubbles]); }, ...overrides };
  }
  const emptySerial = serialInput(), existingSerial = serialInput({ value: 'My-Code' }),
    disabledSerial = serialInput({ disabled: true }), readonlySerial = serialInput({ readOnly: true }),
    hiddenSerial = serialInput({ getClientRects: () => [] });
  p = await page({ TicketplusSerialNumber: 'AbC-123!@' }, [], [emptySerial, existingSerial, disabledSerial, readonlySerial, hiddenSerial]);
  assert.equal(emptySerial.value, 'AbC-123!@', 'prefill serial without enabling auto selection or changing case/symbols');
  assert.deepEqual(emptySerial.events, [['input', true], ['change', true]], 'notify the site model');
  assert.equal(existingSerial.value, 'My-Code');
  assert.equal(disabledSerial.value + readonlySerial.value + hiddenSerial.value, '');
  emptySerial.value = '';
  existingSerial.value = '';
  p.run();
  assert.equal(emptySerial.value + existingSerial.value, '', 'never refill a field the user has cleared');
  const lateSerial = serialInput();
  p = await page({}, [], [lateSerial]);
  assert.equal(lateSerial.value, '', 'empty settings leave inputs alone');
  p.change({ TicketplusSerialNumber: { newValue: 'New+Code' } }, 'local');
  assert.equal(lateSerial.value, 'New+Code', 'settings synchronize to untouched inputs immediately');
  const focusedSerial = serialInput();
  p = await page({ TicketplusSerialNumber: 'Focus-Code' }, [], [focusedSerial], focusedSerial);
  assert.equal(focusedSerial.value, 'Focus-Code', 'site autofocus must not block prefill of an untouched empty field');
  focusedSerial.value = '';
  p.run();
  assert.equal(focusedSerial.value, '', 'clearing an autofocused filled field is still respected');
  const touchedSerial = serialInput({ matches: () => true });
  p = await page({}, [], [touchedSerial]);
  p.input({ isTrusted: true, target: touchedSerial });
  p.change({ TicketplusSerialNumber: { newValue: 'New-Code' } }, 'local');
  assert.equal(touchedSerial.value, '', 'a manually cleared field stays empty even before settings arrive');
  list = [area('A1', 800)];
  p = await page({ TicketplusAutoSelect: true }, list);
  p.change({ TicketplusNextOnlySpecified: { newValue: false } }, 'local');
  p.nextButton.disabled = true;
  p.run();
  assert.equal(p.nextButton.clicks, 0, 'wait until Next is enabled');
  p.nextButton.disabled = false;
  p.run();
  assert.equal(p.nextButton.clicks, 1, 'advance once after automatic selection');
  p.run();
  assert.equal(p.nextButton.clicks, 1, 'never repeatedly submit Next');
  list = [area('A1', 800)];
  p = await page({ TicketplusAutoSelect: true }, list);
  p.click({ isTrusted: true, target: { closest: sel => sel === '.seats-area, .count-button' ? {} : null } });
  p.run();
  assert.equal(p.nextButton.clicks, 0, 'manual takeover does not auto advance');
  list = [area('A1', 800)];
  p = await page({ TicketplusAutoSelect: true }, list);
  p.run();
  assert.equal(p.nextButton.clicks, 0, 'empty allowlist selects tickets without advancing');
  assert.equal(p.nextStatus.textContent, '自動下一步：此頁未啟用');
  p.change({ TicketplusNextUrl: { newValue: 'https://ticketplus.com.tw/order/abc/other' } }, 'local');
  p.run();
  assert.equal(p.nextButton.clicks, 0, 'a different session does not match');
  p.change({ TicketplusNextUrl: { newValue: 'https://example.com/order/abc/def' } }, 'local');
  p.run();
  assert.equal(p.nextButton.clicks, 0, 'reject other domains');
  p.change({ TicketplusNextUrl: { newValue: 'https://ticketplus.com.tw/order/abc/def/?from=test#ticket' } }, 'local');
  p.run();
  assert.equal(p.nextButton.clicks, 1, 'matching session ignores query/hash and trailing slash');
  assert.equal(p.nextStatus.textContent, '自動下一步：適用此頁');
  p.change({ TicketplusNextOnlySpecified: { newValue: false } }, 'local');
  p.run();
  assert.equal(p.nextButton.clicks, 1, 'changing page restrictions does not advance twice');
  let tones = 0, peak = 0;
  class AudioMock {
    state = 'running'; currentTime = 0;
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { tones++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime(value) { peak = value; }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  list = [area('A1', 800, '剩餘 0')];
  p = await page({}, list, [], null, AudioMock);
  p.unlockAudio();
  p.run();
  assert.equal(tones, 0);
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 2 NT.800';
  p.run();
  assert.equal(tones, 2, 'two quiet tones when stock appears, even with auto select off');
  assert.ok(peak <= 0.04);
  p.run();
  assert.equal(tones, 2, 'no repeated alarm while stock remains');
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 0 NT.800';
  p.run();
  list[0].querySelector('.v-expansion-panel-header').textContent = 'A1 剩餘 1 NT.800';
  p.run();
  assert.equal(tones, 4, 'announce a new stock transition');
  flat = [];
  for (const [min, max, random, expected] of [[1, 3, 0, 1], [1, 3, 0.999, 3], [2, 2, 0.5, 2], [5, 2, 0.999, 5], [0, -2, 0, 1], ['bad', 'bad', 0, 4]]) {
    p = await page({ TicketplusAutoSelect: true, TicketplusRefreshMin: min, TicketplusRefreshMax: max }, []);
    p.resetRefresh();
    p.refresh(1000, random);
    assert.equal(p.countdown.textContent, `更新票數：${expected} 秒`);
    p.refresh(1000 + expected * 1000 - 1, random);
    assert.equal(p.refreshButton.clicks, 0);
    p.refresh(1000 + expected * 1000, random);
    assert.equal(p.refreshButton.clicks, 1);
  }
  p.change({ TicketplusRefreshMin: { newValue: 1 }, TicketplusRefreshMax: { newValue: 1 } }, 'local');
  p.refresh(20000);
  assert.equal(p.countdown.textContent, '更新票數：1 秒', 'range changes restart countdown');
  p.click({ isTrusted: true, target: { closest: sel => sel === '.seats-area, .count-button' ? {} : null } });
  p.change({ TicketplusRefreshMin: { newValue: 2 } }, 'local');
  p.refresh(30000);
  assert.equal(p.countdown.textContent, '自動更新已暫停', 'range changes preserve manual takeover');
  console.log('ticketplus selection checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
