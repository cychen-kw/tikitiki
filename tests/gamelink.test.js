const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let rows = [], observe, scans = 0;
function row(id, href) {
  const cell = { firstChild: null, link: null, querySelector() { return this.link; }, appendChild(a) { this.link = a; } };
  return { cell, querySelectorAll: () => [{}, cell],
    querySelector: () => href ? { getAttribute: () => href } : null,
    getAttribute: () => id };
}
const first = row('101');
rows = [first];
const context = vm.createContext({
  location: { pathname: '/activity/detail/demo' },
  document: { body: {}, querySelectorAll() { scans++; return rows; }, createElement: () => ({}) },
  MutationObserver: class { constructor(fn) { observe = fn; } observe() {} }
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/gamelink.js'), 'utf8'), context);
context.linkGameSessions();
assert.equal(first.cell.link.href, '/ticket/area/demo/101');
const oldLink = first.cell.link;
const update = [{ target: { closest: () => true }, addedNodes: [] }];
observe(update);
assert.equal(first.cell.link, oldLink, 'existing links are not wrapped again');
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
