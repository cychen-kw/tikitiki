const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rows = ['VIP 紅區', '一般 黃區', 'VIP 輪椅'].map(textContent => ({
  textContent, style: {}, querySelector: () => ({}),
  classList: { toggle(name, enabled) { this.highlighted = enabled; } }
}));
let changed;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/area.js'), 'utf8'), {
  document: { createElement: () => ({}), head: { appendChild() {} }, querySelectorAll: () => rows },
  addClockWidget() {},
  chrome: { storage: {
    local: { get(defaults, callback) { callback({ ...defaults, AutoClickAreaName: 'VIP', HideDisabledArea: true }); } },
    onChanged: { addListener(fn) { changed = fn; } }
  } }
});
assert.deepEqual(rows.map(row => row.classList.highlighted), [true, false, true]);
assert.equal(rows[2].style.display, 'none', 'highlight does not reveal hidden areas');
changed({ AutoClickAreaName: { newValue: '黃區' } }, 'local');
assert.deepEqual(rows.map(row => row.classList.highlighted), [false, true, false]);
changed({ AutoClickAreaName: { newValue: '' } }, 'local');
assert.ok(rows.every(row => !row.classList.highlighted));
console.log('tixCraft area highlight checks passed');
