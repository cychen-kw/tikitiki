// Run: node tests/kktix-limits.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let scope;
let tick;
let label;
let insertions = 0;
const unit = {
  dataset: {},
  querySelector: () => label,
  appendChild(value) { label = value; insertions++; }
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/kktix/limits.js'), 'utf8'), {
  document: { querySelectorAll: () => [unit], createElement: () => ({ style: {} }) },
  window: { angular: { element: () => ({ scope: () => scope }) } },
  setInterval(fn) { tick = fn; }
});
assert.equal(label.textContent, '可選上限：讀取中');
scope = { ticketModel: { quantity: 0 }, availableCapacity: 30,
  purchasableQuantity: [0, 5, 10, 15, 20, 25, 30],
  runTime: { event: { max_to_buy: 30 } }, $parent: { totalQuantity: () => 1 } };
tick();
assert.equal(label.textContent, '票種上限 30 張（本票種已選 0 張）');
assert.deepEqual(JSON.parse(unit.dataset.tikitikiQuantities), [0,5,10,15,20,25,30]);
scope.ticketModel.quantity = 5;
scope.$parent.totalQuantity = () => 6;
tick();
assert.equal(label.textContent, '票種上限 30 張（本票種已選 5 張）');
scope.availableCapacity = 4;
tick();
assert.equal(label.textContent, '票種上限 0 張（本票種已選 5 張）');
scope.ticketModel.quantity = 1;
scope.purchasableQuantity = [0, 1, 2, 3, 4];
scope.runTime.event.max_to_buy = 0;
tick();
assert.equal(label.textContent, '票種上限 4 張（本票種已選 1 張）');
// thrillingimprov0919: null means no event-wide cap, not loading.
scope.runTime.event.max_to_buy = null;
scope.$parent.totalQuantity = () => 5;
for (const [capacity, allowed] of [[4, [0, 1, 2, 3, 4]], [4, [0, 2, 4]], [2, [0, 1, 2]]]) {
  scope.ticketModel.quantity = 0;
  scope.availableCapacity = capacity;
  scope.purchasableQuantity = allowed;
  tick();
  assert.equal(label.textContent, `票種上限 ${capacity} 張（本票種已選 0 張）`);
}
scope.runTime.event.max_to_buy = undefined;
tick();
assert.equal(label.textContent, '票種上限 2 張（本票種已選 0 張）', 'event limit is irrelevant');
delete scope.$parent;
delete scope.runTime;
tick();
assert.equal(label.textContent, '票種上限 2 張（本票種已選 0 張）');
scope.busy = true;
tick();
assert.equal(label.textContent, '可選上限：網站處理中');
scope = undefined;
tick();
assert.equal(label.textContent, '可選上限：讀取中');
assert.equal(unit.dataset.tikitikiQuantities, undefined, 'discard stale model data');
assert.equal(insertions, 1);
console.log('KKTIX limit checks passed');
