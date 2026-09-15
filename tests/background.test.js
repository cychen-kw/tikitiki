const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
let action, message;
const urls = [];
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../background.js'), 'utf8'), {
  chrome: {
    action: { onClicked: { addListener(fn) { action = fn; } } },
    tabs: { create({ url }) { urls.push(url); } },
    runtime: { getURL: file => 'chrome-extension://test/' + file,
      onMessage: { addListener(fn) { message = fn; } }, openOptionsPage() {} }
  }
});
action();
message({ tikitikiOpenOptions: true, platform: 'tixcraft' });
message({ tikitikiOpenOptions: true, platform: 'kktix' });
message({ tikitikiOpenOptions: true, platform: 'ibon' });
assert.deepEqual(urls, ['chrome-extension://test/options.html', 'chrome-extension://test/options.html#tixcraft', 'chrome-extension://test/options.html#kktix', 'chrome-extension://test/options.html#ibon']);
console.log('Options entry point checks passed');
