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

// Custom exclusions take precedence over highlighting, inclusion and both click paths.
for (const keywords of [' 紅區 , , 遮擋 ', '', ',  ,']) {
  const clicked = [];
  const areas = ['VIP 紅區 熱賣中', 'VIP 遮擋 熱賣中', 'VIP 輪椅 熱賣中', 'VIP 黃區 熱賣中'].map(textContent => ({
    textContent, style: {},
    get offsetParent() { return this.style.display === 'none' ? null : {}; },
    querySelector: () => ({ click() { clicked.push(textContent); } }),
    classList: { toggle() {} }
  }));
  let trigger, update;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/area.js'), 'utf8'), {
    document: { createElement: () => ({}), head: { appendChild() {} }, querySelectorAll: () => areas },
    addClockWidget(fn) { trigger = fn; },
    chrome: { storage: {
      local: { get(defaults, callback) { callback({ ...defaults, HiddenAreaName: keywords,
        AutoClickArea: true, AutoClickAreaName: 'VIP', HideDisabledArea: true,
        ShowOnlyArea: true, AreaName: 'VIP' }); } },
      onChanged: { addListener(fn) { update = fn; } }
    } }
  });
  const expected = keywords.trim().startsWith('紅區') ? areas[3] : areas[0];
  assert.deepEqual(clicked, [expected.textContent]);
  update({ AutoClickAreaName: { newValue: 'VIP' } }, 'local');
  trigger();
  assert.deepEqual(clicked, [expected.textContent, expected.textContent]);
  assert.equal(areas[2].style.display, 'none');
  if (expected === areas[3]) assert.ok(areas.slice(0, 3).every(row => row.style.display === 'none'));
}

// Inclusion depends only on nonempty keywords, regardless of the legacy switch.
for (const legacySwitch of [false, true]) {
  for (const [keywords, visible] of [[' 黃區 , 輪椅 , ', [false, true, false]], ['', [true, true, false]], [',  ,', [true, true, false]], ['不存在', [false, false, false]]]) {
    const areas = ['紅區', '黃區', '黃區 輪椅'].map(textContent => ({
      textContent, style: {}, querySelector: () => ({}), classList: { toggle() {} }
    }));
    vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/tixcraft/area.js'), 'utf8'), {
      document: { createElement: () => ({}), head: { appendChild() {} }, querySelectorAll: () => areas },
      addClockWidget() {},
      chrome: { storage: {
        local: { get(defaults, callback) { callback({ ...defaults, AreaName: keywords, ShowOnlyArea: legacySwitch, HideDisabledArea: true }); } },
        onChanged: { addListener() {} }
      } }
    });
    assert.deepEqual(areas.map(row => row.style.display !== 'none'), visible);
  }
}
