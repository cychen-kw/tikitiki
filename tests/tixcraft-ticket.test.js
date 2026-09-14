const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/ticket.js'), 'utf8');
function select(target, allow, values) {
  const options = values.map(value => ({ value: String(value), selected: false }));
  options.push({ value: '9', disabled: true });
  vm.runInNewContext(source, {
    addClockWidget() {},
    document: { querySelectorAll: () => options, getElementById: () => null },
    chrome: { storage: { local: { get(defaults, callback) {
      callback({ TicketNumber: target, AutoClickAllowInsufficient: allow });
    } } } }
  });
  return options.find(option => option.selected)?.value;
}
assert.equal(select(2, false, [0, 1, 2, 4]), '2');
assert.equal(select(2, false, [0, 1, 4]), undefined);
assert.equal(select(2, true, [0, 1, 4]), '1');
assert.equal(select(2, true, [0, 5]), undefined);
assert.equal(select(0, false, [0, 1, 4]), '4');
assert.equal(select('invalid', true, [0, 1, 4]), undefined);
console.log('tixCraft ticket checks passed');
