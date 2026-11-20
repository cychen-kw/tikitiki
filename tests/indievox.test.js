const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const entries = require('../manifest.json').content_scripts.filter(entry =>
  entry.matches.some(match => match.startsWith('https://www.indievox.com/')));
assert.deepEqual(entries.flatMap(entry => entry.matches), [
  'https://www.indievox.com/activity/detail/*',
  'https://www.indievox.com/activity/game/*',
  'https://www.indievox.com/ticket/area/*',
  'https://www.indievox.com/ticket/ticket/*'
]);

const detailEntry = entries[0];
const detailOrigin = 'https://www.indievox.com';
function detailLink(pathname, origin = detailOrigin) {
  return { pathname, origin, getAttribute: () => null, getClientRects: () => [{}],
    clicks: 0, click() { this.clicks++; } };
}
const otherEvent = detailLink('/activity/game/other');
const external = detailLink('/activity/game/demo', 'https://example.com');
const buyLink = detailLink('/activity/game/demo');
const secondBuyLink = detailLink('/activity/game/demo');
const sessionUrls = ['/ticket/area/demo/123', '/ticket/area/demo/456'];
const cells = sessionUrls.map(() => ({
  querySelector() { return this.link; }, appendChild(link) { this.link = link; }
}));
const detailContext = vm.createContext({
  location: { origin: detailOrigin, pathname: '/activity/detail/demo' },
  document: {
    links: [otherEvent, external, buyLink, secondBuyLink],
    querySelectorAll: () => sessionUrls.map((url, index) => ({
      querySelectorAll: () => [{}, cells[index]],
      querySelector: () => ({ getAttribute: () => url })
    })),
    createElement: () => ({ style: {} }), body: {}
  },
  MutationObserver: class { observe() {} }
});
for (const file of detailEntry.js) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), detailContext);
}
assert.deepEqual(cells.map(cell => cell.link.href), sessionUrls);
assert.deepEqual([otherEvent, external, buyLink, secondBuyLink].map(link => link.clicks), [0, 0, 1, 0]);

const clicked = [];
const rows = ['身障席 剩餘 2', '全區 熱賣中'].map(textContent => ({
  textContent, style: {}, offsetParent: {}, classList: { toggle() {} },
  querySelector: () => ({ click() { clicked.push(textContent); } })
}));
let changed;
const settings = { AutoClickArea: true, IndieVoxAutoClickAreaName: '身障席,全區', IndieVoxTicketNumber: 2 };
const context = vm.createContext({
  location: { hostname: 'www.indievox.com' },
  Event, addClockWidget() {},
  document: { createElement: () => ({}), head: { appendChild() {} }, querySelectorAll: () => rows },
  chrome: { storage: {
    local: { get(defaults, callback) {
      callback(Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, settings[key] ?? value])));
    } },
    onChanged: { addListener(fn) { changed = fn; } }
  } }
});
const load = name => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/tixcraft', name), 'utf8'), context);
load('area.js');
changed({ AutoClickArea: { newValue: true } }, 'local');
assert.deepEqual(clicked, [], 'tixCraft settings do not turn on IndieVox area selection');
changed({ IndieVoxAutoClickArea: { newValue: true } }, 'local');
assert.deepEqual(clicked, ['全區 熱賣中'], 'accessible area is skipped even when ranked first and in stock');

const events = [];
const select = { dispatchEvent(event) { events.push(event); } };
const options = [0, 1, 2, 4].map(value => ({ value: String(value), closest: () => select }));
context.document.querySelectorAll = () => options;
const agreement = { checked: false };
const captcha = { value: '', focused: false, focus() { this.focused = true; } };
context.document.getElementById = id => ({ TicketForm_agree: agreement, TicketForm_verifyCode: captcha })[id];
load('ticket.js');
assert.equal(options.find(option => option.selected)?.value, '2');
assert.equal(events.length, 1);
assert.equal(events[0].type, 'change');
assert.equal(events[0].bubbles, true);
assert.equal(agreement.checked, true);
assert.equal(captcha.focused, true);
assert.equal(captcha.maxLength, 4);
assert.equal(captcha.value, '');
