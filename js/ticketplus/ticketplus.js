// Open the matching area and press the site's + button one click at a time; never press Next.
const ticketplusDefaults = { TicketplusAutoSelect: false, TicketplusPrice: '', TicketplusTicketNumber: '2' };
let ticketplusSettings;
let ticketplusScope = { key: '', ids: [] };
let ticketplusRun = {};
let ticketplusPath = location.pathname;
const ticketplusDisabledArea = /身障|身心障礙|輪椅/;

// A trusted click on the ticket list means the user has taken over this page.
// 更新票數 clears every count after its request returns, without reloading; remember the click.
document.addEventListener('click', event => {
  if (!event.isTrusted || event.target.closest?.('.tikitiki-ticket-scope')) return;
  const button = event.target.closest?.('button')?.textContent || '';
  if (/更新票數/.test(button)) ticketplusRun.refreshAt = Date.now();
  else if (/清除選擇/.test(button) || event.target.closest?.('.seats-area, .count-button')) {
    ticketplusRun.done = true;
    delete ticketplusRun.selected;
  }
}, true);

function ticketplusPrices(text) {
  return [...String(text).matchAll(/NT\.?\s*([\d,]+)/g)].map(match => Number(match[1].replace(/,/g, '')));
}

function ticketplusCount(row) {
  const count = row.querySelector('.count-button');
  if (!count) return null;
  const plus = count.querySelector('.mdi-plus')?.closest('button');
  const minus = count.querySelector('.mdi-minus')?.closest('button');
  const value = Number(count.children[1]?.textContent.trim());
  return plus && minus && Number.isInteger(value) ? { plus, minus, value } : null;
}

// Area headers name the area in their first column; tickets inside an area sit just before
// .ticket-price; ticket-type pages name each row in its first column. Only the element's own
// text counts, so status chips such as 剩餘 or 熱賣中 are left out.
function ticketplusNameElement(item) {
  if (item.matches?.('.v-expansion-panel')) return item.querySelector('.v-expansion-panel-header .row')?.firstElementChild;
  return item.querySelector('.ticket-price')?.previousElementSibling || item.firstElementChild;
}
function ticketplusName(item) {
  return [...(ticketplusNameElement(item)?.childNodes || [])].filter(node => node.nodeType === 3)
    .map(node => node.textContent).join('').trim();
}
// Tickets inside an area are saved as "area / ticket" so equal ticket names in different areas stay apart.
function ticketplusId(row) {
  const panel = row.closest('.seats-area > .v-expansion-panel');
  return panel ? ticketplusName(panel) + ' / ' + ticketplusName(row) : ticketplusName(row);
}

function ticketplusScopeKey() {
  return 'TicketplusTicketScope:' + location.pathname.split('/')[2];
}

// ＋ buttons let the user choose ticket types, like KKTIX. Tickets inside an area appear once it is opened.
function ticketplusDecorate() {
  const ids = ticketplusScope.ids;
  const items = [...[...document.querySelectorAll('.seats-area .ticket-price')].map(price => price.closest('.row')),
    ...[...document.querySelectorAll('.rwd-margin > .row')].filter(row => !row.closest('.seats-area') && ticketplusPrices(row.textContent).length)];
  for (const item of items) {
    if (!item) continue;
    const name = ticketplusId(item);
    const nameElement = ticketplusNameElement(item);
    if (!ticketplusName(item) || !nameElement || ticketplusDisabledArea.test(name)) continue;
    let toggle = nameElement.querySelector('.tikitiki-ticket-scope');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tikitiki-ticket-scope';
      toggle.style.cssText = 'margin-left:8px;min-width:26px;min-height:26px;padding:0 5px;border:1px solid #1e88c8;border-radius:50%;font-size:16px;cursor:pointer;vertical-align:middle;';
      toggle.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const key = ticketplusScope.key;
        const selected = ticketplusScope.ids;
        const next = selected.includes(name) ? selected.filter(id => id !== name) : [...selected, name];
        const eventName = document.title.split(' | ')[1]?.trim() || document.title;
        toggle.disabled = true;
        try {
          await chrome.storage.local.set({ [key]: next,
            [key.replace('TicketplusTicketScope:', 'TicketplusTicketInfo:') + ':' + name]: { eventName, ticketName: name, url: location.href } });
        } catch (error) {
          toggle.title = '範圍儲存失敗，請重試';
          console.error('TikiTiki: 無法儲存票種範圍', error);
        } finally {
          toggle.disabled = false;
        }
      });
      nameElement.appendChild(toggle);
    }
    const index = ids.indexOf(name);
    const caption = index >= 0 ? `✓ ${index + 1}` : '＋';
    if (toggle.textContent === caption) continue;
    toggle.textContent = caption;
    toggle.title = index >= 0 ? `加入順序 ${index + 1}；點擊移除` : '加入自動點擊範圍';
    toggle.setAttribute('aria-label', name + '：' + toggle.title);
    toggle.setAttribute('aria-pressed', String(index >= 0));
    toggle.style.background = index >= 0 ? '#1e88c8' : '#fff';
    toggle.style.color = index >= 0 ? '#fff' : '#1e88c8';
  }
}

function updateTicketplus(now = Date.now()) {
  if (location.pathname !== ticketplusPath) {
    ticketplusPath = location.pathname;
    ticketplusRun = {};
  }
  if (!location.pathname.startsWith('/order/')) return;
  const key = ticketplusScopeKey();
  if (ticketplusScope.key !== key) {
    ticketplusScope = { key, ids: [], loading: true };
    chrome.storage.local.get({ [key]: [] }).then(items => {
      if (ticketplusScope.key === key) ticketplusScope = { key, ids: Array.isArray(items[key]) ? items[key] : [] };
    }).catch(error => console.error('TikiTiki: 無法讀取 ticketplus 票種範圍', error));
  }
  if (ticketplusScope.loading) return;
  ticketplusDecorate();

  let run = ticketplusRun;
  // Select again once the site has cleared our finished selection after 更新票數.
  if (run.done && run.refreshAt) {
    if (run.selected && Number(run.selected.children[1]?.textContent.trim()) === 0) run = ticketplusRun = {};
    else if (now - run.refreshAt > 60000) delete run.refreshAt;
  }
  if (!ticketplusSettings?.TicketplusAutoSelect || run.done) return;
  // Added tickets take precedence; without any, fall back to the price list.
  const scoped = ticketplusScope.ids.length > 0;
  const prefs = scoped ? ticketplusScope.ids :
    String(ticketplusSettings.TicketplusPrice).split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  const target = Number(ticketplusSettings.TicketplusTicketNumber);
  if (!prefs.length || !Number.isInteger(target) || target < 0 || target > 4) return;
  run.failed ??= new Set();

  const matches = (text, name, want) => !/售完/.test(text) && !ticketplusDisabledArea.test(text) &&
    !(target > 0 && Number(text.match(/剩餘\s*(\d+)/)?.[1] ?? Infinity) < target) &&
    (scoped ? name === want : ticketplusPrices(text).includes(want));
  // Ticket-type pages list every row with its own count button; area pages only render
  // the count buttons of the opened area. Sold-out rows have no count button.
  const rows = [...document.querySelectorAll('.count-button')].map(count => count.closest('.row')).filter(Boolean);
  const panels = [...document.querySelectorAll('.seats-area > .v-expansion-panel')];
  let row;
  for (const want of prefs) {
    row = rows.find(row => !run.failed.has(row.closest('.v-expansion-panel') || row) && matches(row.textContent, ticketplusId(row), want));
    if (row) break;
    const panel = panels.find(panel => {
      const header = panel.querySelector('.v-expansion-panel-header');
      // An added ticket inside an area first needs that area opened.
      const name = scoped && String(want).startsWith(ticketplusName(panel) + ' / ') ? want : ticketplusName(panel);
      return header && !header.disabled && !run.failed.has(panel) && matches(header.textContent, name, want);
    });
    if (!panel) continue;
    // Opening an area resets the counts in the previously opened one.
    if (run.opened !== panel) {
      run.opened = panel;
      delete run.before;
      if (!panel.classList.contains('v-expansion-panel--active')) panel.querySelector('.v-expansion-panel-header').click();
    }
    return; // Area content is still rendering.
  }
  const count = row && ticketplusCount(row);
  if (!count) return;
  if (run.before !== undefined) {
    if (count.value <= run.before && now - run.clickedAt < 1500) return;
    // Paired tickets step by 2: keep a count our own click pushed past the target.
    if (target > 0 && run.before < target && count.value > target) {
      run.done = true;
      run.selected = row.querySelector('.count-button');
      return;
    }
    delete run.before;
  }
  if (target > 0 && count.value === target) {
    run.done = true;
    run.selected = row.querySelector('.count-button');
    return;
  }
  if (target > 0 && count.value > target) {
    count.minus.click();
    return;
  }
  if (count.plus.disabled) {
    if (target === 0 && count.value > 0) {
      run.done = true;
      run.selected = row.querySelector('.count-button');
      return;
    }
    // Not enough tickets here: clear this row and try the next match.
    for (let i = 0; i < count.value; i++) count.minus.click();
    run.failed.add(row.closest('.v-expansion-panel') || row);
    return;
  }
  run.before = count.value;
  run.clickedAt = now;
  count.plus.click();
}

chrome.storage.local.get(ticketplusDefaults).then(items => {
  ticketplusSettings = items;
  updateTicketplus();
}).catch(error => console.error('TikiTiki: 無法讀取 ticketplus 設定', error));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !ticketplusSettings) return;
  // A changed list only reorders the remaining choices; keep any finished selection.
  if (changes[ticketplusScope.key]) ticketplusScope.ids = changes[ticketplusScope.key].newValue ?? [];
  let changed = false;
  for (const key of Object.keys(ticketplusDefaults)) {
    if (!changes[key]) continue;
    ticketplusSettings[key] = changes[key].newValue ?? ticketplusDefaults[key];
    changed = true;
  }
  if (changed) ticketplusRun = {};
  updateTicketplus();
});
setInterval(updateTicketplus, 200);
addClockWidget(undefined, 'TicketplusAutoSelect');
