const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
{
  const platform = 'tixcraft', login = '/login', logout = '/logout';
  let links = [];
  const origin = `https://${platform}.com`;
  const context = vm.createContext({ URL, location: { href: origin, origin }, document: { querySelectorAll: () => links } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/${platform}/login.js`), 'utf8'), context);
  const link = route => ({ href: origin + route, closest: () => null });
  assert.equal(context.getTikitikiLoginState(), null);
  links = [link(login + '?back_to=event')];
  assert.equal(context.getTikitikiLoginState(), false);
  links.push(link(logout));
  assert.equal(context.getTikitikiLoginState(), true);
  if (platform === 'tixcraft') {
    links = [link('/login'), link('/login/logout')];
    assert.equal(context.getTikitikiLoginState(), true, 'actual tixCraft logout route overrides leftover login links');
    links.reverse();
    assert.equal(context.getTikitikiLoginState(), true, 'link order does not affect logged-in detection');
  }
  links = [{ href: 'https://example.com' + login }];
  assert.equal(context.getTikitikiLoginState(), null);
}
const manifest = require('../manifest.json');
for (const entry of manifest.content_scripts.filter(entry => entry.js.includes('js/widget.js'))) {
  if (!entry.matches.some(url => url.startsWith('https://tixcraft.com/'))) assert.ok(!entry.js.some(script => script.endsWith('/login.js')));
  else assert.equal(entry.js[0], 'js/tixcraft/login.js');
}
console.log('Login checks passed');
