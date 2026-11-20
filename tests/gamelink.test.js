const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let rows = [], observe, scans = 0;
function row(id, href) {
  const cell = { firstChild: null, link: null, querySelector() { return this.link; }, appendChild(a) { this.link = a; } };
  const venueCell = { ...cell, textContent: ' 台北場館 & Live ' };
  return { cell, venueCell, querySelectorAll: () => [{}, cell, venueCell],
    querySelector: () => href ? { getAttribute: () => href } : null,
    getAttribute: () => id };
}
const first = row('101');
rows = [first];
const context = vm.createContext({
  location: { pathname: '/activity/detail/demo' },
  document: { body: {}, querySelectorAll() { scans++; return rows; }, createElement: () => ({ style: {} }) },
  MutationObserver: class { constructor(fn) { observe = fn; } observe() {} }
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/gamelink.js'), 'utf8'), context);
context.linkGameSessions();
assert.equal(first.cell.link.href, '/ticket/area/demo/101');
assert.equal(first.cell.link.style.color, '#1a56b0');
assert.equal(first.cell.link.style.textDecoration, 'underline');
const mapLink = first.venueCell.link;
assert.equal(new URL(mapLink.href).searchParams.get('query'), '台北場館 & Live');
assert.equal(mapLink.target, '_blank');
const oldLink = first.cell.link;
const update = [{ target: { closest: () => true }, addedNodes: [] }];
observe(update);
assert.equal(first.cell.link, oldLink, 'existing links are not wrapped again');
assert.equal(first.venueCell.link, mapLink, 'venue links are not wrapped again');
rows = [row('102', '/ticket/area/demo/102')];
observe([{ target: {}, addedNodes: [{ nodeType: 1, matches: () => false, querySelector: () => true }] }]);
assert.equal(rows[0].cell.link.href, '/ticket/area/demo/102', 'replacement container gets links');
rows = [row('103')];
observe(update);
assert.equal(rows[0].cell.link.href, '/ticket/area/demo/103', 'repeated reload gets links');
const count = scans;
observe([{ target: {}, addedNodes: [{ nodeType: 3 }] }]);
assert.equal(scans, count, 'clock updates do not rescan sessions');
console.log('Session link reload checks passed');
