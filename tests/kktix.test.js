// Run: node tests/kktix.test.js (no dependencies, no live purchases).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/kktix/kktix.js'), 'utf8');

function ticket(id, limit = 4, quantity = 0) {
  const input = { value: String(quantity), getClientRects: () => [1] };
  const plus = {
    clicks: 0, disabled: quantity >= limit,
    classList: { contains: () => false }, getAttribute: () => null,
    click() {
      this.clicks++;
      input.value = String(Number(input.value) + 1);
      this.disabled = Number(input.value) >= limit;
    }
  };
  let toggle;
  const name = { textContent: id, appendChild(button) { toggle = button; } };
  return {
    id, input, plus, get toggle() { return toggle; },
    querySelector(selector) {
      if (selector === '.ticket-name') return name;
      if (selector === '.tikitiki-ticket-scope') return toggle;
      if (selector === 'button.plus') return plus;
      if (selector.startsWith('input')) return input;
      throw Error(selector);
    }
  };
}

async function page(rows, settings = {}, codeInputs = []) {
  const key = 'KktixTicketScope:event-a';
  let onChanged;
  const stored = { KktixAutoSelect: true, KktixTicketNumber: '2', [key]: rows.map(r => r.id), ...settings };
  const context = vm.createContext({
    addClockWidget(callback, key) { assert.equal(key, 'KktixAutoSelect'); },
    console, location: { pathname: '/events/event-a/registrations/new' },
    Date, Event, setInterval() {},
    document: {
      querySelector: () => ({ textContent: '測試節目' }),
      querySelectorAll: selector => selector === '.ticket-unit input.member-code' ? codeInputs : rows,
      createElement: () => ({ style: {}, attributes: {}, dataset: {},
        setAttribute(key, value) { this.attributes[key] = value; },
        getAttribute(key) { return this.attributes[key]; },
        addEventListener(type, handler) { this[type] = handler; }
      })
    },
    chrome: { storage: {
      local: {
        get: async defaults => ({ ...defaults, ...stored }),
        set: async values => {
          Object.assign(stored, values);
          onChanged(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { newValue: v }])), 'local');
        }
      },
      onChanged: { addListener(handler) { onChanged = handler; } }
    } }
  });
  vm.runInContext(source, context);
  await Promise.resolve();
  return { context, stored, tick: () => context.updateKktixTickets() };
}

(async () => {
  for (const target of [1, 2, 3, 4, 0]) {
    const rows = [ticket('ticket_1'), ticket('ticket_2')];
    const p = await page(rows, { KktixTicketNumber: String(target) });
    for (let i = 0; i < 20; i++) p.tick();
    assert.equal(Number(rows[0].input.value), target || 4);
    assert.equal(rows[1].plus.clicks, 0, 'only one ticket type');
    rows[0].input.value = '0';
    p.tick();
    assert.equal(rows[0].input.value, '0', 'do not refill after completion');
  }
  const rows = [ticket('ticket_1', 0), ticket('ticket_2'), ticket('ticket_3')];
  const p = await page(rows);
  for (let i = 0; i < 5; i++) p.tick();
  assert.equal(rows[0].plus.clicks, 0);
  assert.equal(rows[1].input.value, '2', 'skip sold out row');
  assert.equal(rows[2].plus.clicks, 0);
  await rows[1].toggle.click({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(Array.from(p.stored['KktixTicketScope:event-a']), ['ticket_1', 'ticket_3']);
  p.tick();
  assert.equal(rows[2].plus.clicks, 0, 'existing selection blocks mixed purchase');
  assert.equal(rows[1].toggle.attributes['aria-pressed'], 'false');
  assert.equal(p.stored['KktixTicketInfo:event-a:ticket_1'].eventName, '測試節目');
  assert.equal(p.stored['KktixTicketInfo:event-a:ticket_1'].ticketName, 'ticket_1');
  const reloaded = ticket('ticket_2');
  const reloadPage = await page([reloaded], p.stored);
  reloadPage.tick();
  assert.equal(reloaded.plus.clicks, 0, 'removed scope survives reload');
  await reloaded.toggle.click({ preventDefault() {}, stopPropagation() {} });
  reloadPage.tick();
  assert.equal(reloaded.input.value, '2', 'adding scope starts auto selection');

  const lateRows = [];
  const late = await page(lateRows, { 'KktixTicketScope:event-a': ['ticket_late'] });
  lateRows.push(ticket('ticket_late'));
  late.tick();
  late.tick();
  assert.equal(lateRows[0].input.value, '2', 'handle delayed Angular rows');
  const otherEvent = ticket('ticket_1');
  await page([otherEvent], { 'KktixTicketScope:event-a': [], 'KktixTicketScope:event-b': ['ticket_1'] });
  assert.equal(otherEvent.plus.clicks, 0, 'scope is isolated by event');

  for (const settings of [
    { KktixAutoSelect: false }, { 'KktixTicketScope:event-a': [] },
    { 'KktixTicketScope:event-a': null }, { KktixTicketNumber: 'bad' },
    { KktixTicketNumber: '5' }
  ]) {
    const row = ticket('ticket_1');
    (await page([row], settings)).tick();
    assert.equal(row.plus.clicks, 0);
  }
  const partial = ticket('ticket_1', 4, 1);
  const existing = await page([partial]);
  existing.tick();
  assert.equal(partial.plus.clicks, 1, 'count existing tickets toward target');
  const limited = ticket('ticket_1', 1);
  const limitPage = await page([limited]);
  limitPage.tick();
  assert.equal(limited.plus.clicks, 1, 'respect site limit below target');

  const delayed = ticket('ticket_delayed');
  delayed.plus.click = function () { this.clicks++; };
  const state = {};
  const step = p.context.kktixSelectStep;
  step(delayed.input, delayed.plus, 2, state, 0);
  step(delayed.input, delayed.plus, 2, state, 300);
  assert.equal(delayed.plus.clicks, 1, 'wait for Angular quantity update');
  step(delayed.input, delayed.plus, 2, state, 1500);
  assert.equal(state.done, true, 'stop on no progress');

  const fill = p.context.fillKktixQualificationCode;
  const codeInput = () => ({ value: '', getClientRects: () => [1], events: [],
    dispatchEvent(event) { this.events.push([event.type, event.bubbles]); } });
  const code = codeInput();
  fill(code, 'AbC-123!');
  assert.equal(code.value, 'AbC-123!');
  assert.deepEqual(code.events, [['input', true], ['change', true]]);
  code.value = '';
  fill(code, 'AbC-123!');
  assert.equal(code.value, '', 'do not refill a field the user cleared');
  for (const overrides of [{ value: 'manual' }, { disabled: true }, { readOnly: true }, { getClientRects: () => [] }]) {
    const input = Object.assign(codeInput(), overrides);
    fill(input, 'saved');
    assert.equal(input.events.length, 0, 'leave occupied or unavailable fields alone');
  }
  const emptyCode = codeInput();
  fill(emptyCode, '');
  fill(emptyCode, 123);
  assert.equal(emptyCode.value, '');
  assert.equal(emptyCode.events.length, 0);
  const selectedTicket = ticket('ticket_code');
  const delayedCodes = [];
  const codePage = await page([selectedTicket], { KktixQualificationCode: 'Case-123!' }, delayedCodes);
  codePage.tick();
  codePage.tick();
  const revealedCode = codeInput();
  revealedCode.closest = () => selectedTicket;
  delayedCodes.push(revealedCode);
  codePage.tick();
  assert.equal(revealedCode.value, 'Case-123!', 'fill delayed field after auto selection completes');
  selectedTicket.input.value = '0';
  await codePage.context.chrome.storage.local.set({ KktixQualificationCode: 'NewCode' });
  assert.equal(selectedTicket.input.value, '0', 'changing code must not restart ticket selection');
  const manualTicket = ticket('ticket_manual', 4, 1);
  const manualCode = codeInput();
  manualCode.closest = () => manualTicket;
  await page([manualTicket], { KktixAutoSelect: false, KktixQualificationCode: 'ManualCode' }, [manualCode]);
  assert.equal(manualCode.value, 'ManualCode', 'manual ticket selection also fills code');

  // Exercise the real options list and deletion handlers with two events and a legacy ID.
  const data = {
    'KktixTicketScope:a': ['ticket_1', 'ticket_2'],
    'KktixTicketScope:b': ['ticket_1'],
    'KktixTicketInfo:a:ticket_1': { eventName: '<b>節目</b>', ticketName: '一般票' },
    KktixTicketNumber: '3', TicketNumber: '4'
  };
  function element() {
    return { children: [], attributes: {},
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(type, handler) { this[type] = handler; }
    };
  }
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const options = vm.createContext({
    console,
    document: { getElementById: getElement, createElement: element,
      querySelectorAll: () => [], addEventListener() {} },
    chrome: { runtime: { getManifest: () => ({ version: 'test' }) }, storage: {
      local: { get: async () => ({ ...data }), set: async updates => Object.assign(data, updates) },
      onChanged: { addListener() {} }
    } }
  });
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../options.js'), 'utf8'), options);
  await options.renderKktixScope();
  const list = getElement('KktixScopeList');
  assert.equal(list.children.length, 3);
  assert.equal(list.children[0].children[1].textContent, '<b>節目</b>', 'render names as text');
  assert.equal(list.children[0].children[2].textContent, '一般票');
  assert.equal(list.children[1].children[1].textContent, 'a', 'legacy event fallback');
  await list.children[0].children[3].children[0].click();
  assert.deepEqual(Array.from(data['KktixTicketScope:a']), ['ticket_2']);
  assert.deepEqual(data['KktixTicketScope:b'], ['ticket_1'], 'same ID in another event is preserved');
  assert.equal(list.children.length, 2);
  await getElement('KktixScopeClear').click();
  assert.equal(list.children.length, 0);
  assert.equal(getElement('KktixScopeClear').disabled, true);
  assert.equal(data.KktixTicketNumber, '3');
  assert.equal(data.TicketNumber, '4', 'clearing scopes preserves preferences');
  console.log('KKTIX checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
