const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map(), handlers = {}, writes = [];
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: '', type: 'text', children: [],
    addEventListener(type, fn) { this[type] = fn; },
    querySelectorAll() { return this.children.filter(child => child.className === 'tag'); }, replaceChildren() {},
    appendChild(child) { this.children.push(child); },
    insertBefore(child) { this.children.push(child); child.parent = this; },
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); },
    focus() {}, setAttribute() {}
  });
  return elements.get(id);
}
let changed;
const tabs = ['tixcraft', 'kktix', 'ibon'].map(tab => ({
  dataset: { tab }, classList: { toggle(name, value) { this.active = value; } },
  addEventListener(type, fn) { this[type] = fn; }
}));
const panels = ['tixcraft', 'kktix', 'ibon'].map(tab => ({ id: 'tab-' + tab }));
let lastTab = 'kktix';
const context = vm.createContext({
  console, setTimeout: () => 0, clearTimeout() {},
  location: { hash: '' },
  document: { getElementById: element, createElement: () => element(Symbol()),
    querySelectorAll: selector => selector === '.tab-btn' ? tabs : selector === 'main.sections' ? panels : [],
    addEventListener(type, fn) { handlers[type] = fn; } },
  chrome: { runtime: { getManifest: () => ({ version: 'test' }) }, storage: {
    local: { async get(defaults) { return { ...defaults, OptionsLastTab: lastTab }; }, async set(value) { writes.push(value); if (value.OptionsLastTab) lastTab = value.OptionsLastTab; } },
    onChanged: { addListener(fn) { changed = fn; } }
  } }
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../options.js'), 'utf8'), context);
(async () => {
  await handlers.DOMContentLoaded();
  assert.equal(writes.length, 0, 'loading does not write defaults');
  assert.equal(panels[1].hidden, false, 'restores KKTIX tab');
  assert.equal(tabs[1].classList.active, true);
  handlers.change({ target: { id: 'AutoClickArea', type: 'checkbox', checked: true } });
  handlers.change({ target: { name: 'KktixTieBreak', type: 'radio', value: 'bottom', checked: true } });
  handlers.input({ target: { id: 'VerifyCode', type: 'text', value: 'abc' } });
  await vm.runInContext('saveQueue', context);
  assert.equal(JSON.stringify(writes), JSON.stringify([{ AutoClickArea: true }, { KktixTieBreak: 'bottom' }, { VerifyCode: 'abc' }]));
  element('AutoClickArea').type = 'checkbox';
  changed({ AutoClickArea: { newValue: false } }, 'local');
  assert.equal(element('AutoClickArea').checked, false);
  element('AutoClickAreaNameInput').keydown({ key: 'Enter', target: { value: 'VIP' }, preventDefault() {} });
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).AutoClickAreaName, 'VIP');
  element('AutoClickAreaNameClear').click();
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).AutoClickAreaName, '');
  context.renderTags('AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName', ['A', 'B', 'C']);
  const box = element('AutoClickAreaNameBox');
  const drag = { dataTransfer: { setData() {} }, preventDefault() {} };
  box.children[0].dragstart(drag);
  box.children[2].drop(drag);
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).AutoClickAreaName, 'B,C,A');
  box.children[2].dragstart(drag);
  box.children[0].drop(drag);
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).AutoClickAreaName, 'A,B,C');
  const first = box.children[0];
  first.keydown({ target: first, altKey: true, key: 'ArrowRight', preventDefault() {} });
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).AutoClickAreaName, 'B,A,C');
  const count = writes.length;
  box.children[0].drop(drag);
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.length, count, 'external drops do not change keywords');
  await tabs[0].click();
  assert.equal(lastTab, 'tixcraft');
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  context.selectTab('invalid');
  assert.equal(tabs[0].classList.active, true, 'invalid saved tab falls back to tixCraft');
  vm.runInContext('tabChanged = false; location.hash = "#kktix"', context);
  await handlers.DOMContentLoaded();
  assert.equal(panels[1].hidden, false, 'widget source overrides remembered tab');
  assert.equal(lastTab, 'kktix');
  context.location.hash = '';
  await handlers.DOMContentLoaded();
  assert.equal(panels[1].hidden, false, 'toolbar restores last opened tab');
  await tabs[2].click();
  assert.equal(lastTab, 'ibon');
  assert.equal(panels[2].hidden, false);
  handlers.change({ target: { id: 'IbonAllowSeparated', type: 'checkbox', checked: true } });
  element('IbonAreaNameInput').keydown({ key: 'Enter', target: { value: 'B1' }, preventDefault() {} });
  await vm.runInContext('saveQueue', context);
  assert.equal(writes.at(-1).IbonAreaName, 'B1');
  console.log('Options autosave checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
