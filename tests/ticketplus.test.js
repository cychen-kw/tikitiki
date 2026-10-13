const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/ticketplus/ticketplus.js'), 'utf8');

// Name column: own text plus room for the ＋ button.
function nameCell(name) {
  return { childNodes: [{ nodeType: 3, textContent: ' ' + name + ' ' }], toggle: null,
    querySelector() { return this.toggle; }, appendChild(button) { this.toggle = button; } };
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
      nameCell: ticketPrice.previousElementSibling, matches: () => false,
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
    classList: { contains: cls => cls === 'v-expansion-panel--active' && panel.active },
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
async function page(settings, list) {
  panels = list;
  let tick, change, click;
  const stored = { ...settings };
  const context = vm.createContext({ console, Date,
    location: { pathname: '/order/abc/def', href: 'https://ticketplus.com.tw/order/abc/def' },
    document: { title: '票區一覽 | 測試活動 | Ticket Plus遠大售票系統',
      querySelectorAll: sel => sel === '.count-button' ? [...panels.filter(p => p.active).flatMap(p => p.rows), ...flat].map(r => r.count) :
        sel === '.seats-area > .v-expansion-panel' ? panels :
        sel === '.seats-area .ticket-price' ? panels.filter(p => p.active).flatMap(p => p.rows).map(r => r.ticketPrice) : flat,
      createElement: () => ({ style: {}, setAttribute() {}, addEventListener(type, fn) { this.onclick = fn; } }),
      addEventListener(type, fn) { click = fn; } },
    setInterval(fn) { tick = fn; }, addClockWidget(callback, key) { assert.equal(key, 'TicketplusAutoSelect'); },
    chrome: { storage: { local: { async get(defaults) { return { ...defaults, ...stored }; },
      async set(updates) {
        const changes = Object.fromEntries(Object.entries(updates).map(([key, newValue]) => [key, { newValue }]));
        Object.assign(stored, updates);
        change(changes, 'local');
      } },
      onChanged: { addListener(fn) { change = fn; } } } }
  });
  vm.runInContext(source, context);
  await flush();
  tick();
  await flush();
  const run = (n = 10) => { for (let i = 0; i < n; i++) tick(); };
  const press = async toggle => { await toggle.onclick({ preventDefault() {}, stopPropagation() {} }); };
  return { run, change, click, stored, press };
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
  assert.equal(list[0].clicks.header, 0, 'no price does nothing');

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
  assert.equal(list[2].rows[0].nameCell.toggle, null, 'no ＋ for disability areas');

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
  console.log('ticketplus selection checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
