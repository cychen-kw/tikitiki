// Select tickets one click at a time, then advance once to the site's next step.
const ticketplusDefaults = { TicketplusAutoSelect: false, TicketplusPrice: '', TicketplusTicketNumber: '2', TicketplusHideSoldOut: false, TicketplusIgnoreDisabledArea: true, TicketplusSerialNumber: '', TicketplusNextOnlySpecified: true, TicketplusNextUrl: '', TicketplusRefreshMin: 4, TicketplusRefreshMax: 8, TicketplusSoundVolume: 50 };
let ticketplusSettings;
let ticketplusScope = { key: '', ids: [] };
let ticketplusRun = {};
let ticketplusPath = location.pathname;
let ticketplusNextRefresh = 0;
let ticketplusAudio;
let ticketplusStockAnnounced = false;
const ticketplusHandledSerials = new WeakSet();
const ticketplusDisabledArea = /身障|身心障礙|輪椅/;

// A trusted click on the ticket list means the user has taken over this page.
// 更新票數 clears every count after its request returns, without reloading; remember the click.
document.addEventListener('click', event => {
  if (!event.isTrusted || event.target.closest?.('.tikitiki-ticket-scope')) return;
  const button = event.target.closest?.('button')?.textContent || '';
  if (/更新票數/.test(button)) {
    ticketplusRun.refreshAt = Date.now();
    ticketplusNextRefresh = 0;
  }
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

function ticketplusSoldOut(item) {
  const text = item.matches?.('.v-expansion-panel')
    ? item.querySelector('.v-expansion-panel-header')?.textContent || '' : item.textContent;
  return item.matches?.('.soldout') || /售完|暫無票券|剩餘\s*0(?!\d)/.test(text);
}

function ticketplusScopeKey() {
  return 'TicketplusTicketScope:' + location.pathname.split('/')[2];
}

// ＋ buttons let the user choose ticket types, like KKTIX. Tickets inside an area appear once it is opened.
function ticketplusDecorate() {
  const ids = ticketplusScope.ids;
  const items = [...[...document.querySelectorAll('.seats-area .ticket-price')].map(price => price.closest('.row')),
    ...[...document.querySelectorAll('.rwd-margin > .row')].filter(row => !row.closest('.seats-area') && ticketplusPrices(row.textContent).length)];
  for (const item of [...document.querySelectorAll('.seats-area > .v-expansion-panel'), ...items]) {
    if (item) item.classList.toggle('tikitiki-hide-soldout', Boolean(ticketplusSettings?.TicketplusHideSoldOut && ticketplusSoldOut(item)));
  }
  for (const item of items) {
    if (!item) continue;
    const name = ticketplusId(item);
    const nameElement = ticketplusNameElement(item);
    if (!ticketplusName(item) || !nameElement) continue;
    let toggle = nameElement.querySelector('.tikitiki-ticket-scope');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tikitiki-ticket-scope';
      toggle.style.cssText = 'margin-left:8px;min-width:26px;min-height:26px;padding:0 5px;border:1px solid #1e88c8;border-radius:50%;font-size:16px;cursor:pointer;vertical-align:middle;pointer-events:auto;';
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

document.addEventListener('input', event => {
  if (event.isTrusted && event.target.matches?.('input[placeholder*="購票序號"]')) {
    ticketplusHandledSerials.add(event.target);
  }
}, true);

function fillTicketplusSerialNumber() {
  const serial = ticketplusSettings?.TicketplusSerialNumber;
  if (typeof serial !== 'string' || !serial) return;
  for (const input of document.querySelectorAll('input[placeholder*="購票序號"]')) {
    if (input.disabled || input.readOnly || !input.getClientRects().length ||
        ticketplusHandledSerials.has(input)) continue;
    // Preserve existing/manual input, including a field the user clears after our fill.
    ticketplusHandledSerials.add(input);
    if (input.value) continue;
    input.value = serial;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function updateTicketplus(now = Date.now()) {
  if (location.pathname !== ticketplusPath) {
    ticketplusPath = location.pathname;
    ticketplusNextRefresh = 0;
    ticketplusRun = {};
  }
  if (!location.pathname.startsWith('/order/')) return;
  fillTicketplusSerialNumber();
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
  const panels = [...document.querySelectorAll('.seats-area > .v-expansion-panel')];
  let prefs = scoped ? ticketplusScope.ids :
    String(ticketplusSettings.TicketplusPrice).split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  const unrestricted = !scoped && !String(ticketplusSettings.TicketplusPrice).trim();
  // Preserve page order even when a lower area is already open.
  if (unrestricted) prefs = panels.length ? panels.map(ticketplusName) : [null];
  const target = Number(ticketplusSettings.TicketplusTicketNumber);
  if (!prefs.length || !Number.isInteger(target) || target < 0 || target > 4) return;
  run.failed ??= new Set();

  const matches = (text, name, want) => !/售完|暫無票券|剩餘\s*0(?!\d)/.test(text) &&
    !(ticketplusSettings.TicketplusIgnoreDisabledArea && ticketplusDisabledArea.test(text + ' ' + name)) &&
    !(target > 0 && Number(text.match(/剩餘\s*(\d+)/)?.[1] ?? Infinity) < target) &&
    (scoped ? name === want : unrestricted ? want === null || name === want || name.startsWith(want + ' / ') : ticketplusPrices(text).includes(want));
  // Ticket-type pages list every row with its own count button; area pages only render
  // the count buttons of the opened area. Sold-out rows have no count button.
  const rows = [...document.querySelectorAll('.count-button')].map(count => count.closest('.row')).filter(Boolean);
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

function ticketplusHasStock() {
  return [...document.querySelectorAll('.seats-area > .v-expansion-panel')].some(panel => {
    const header = panel.querySelector('.v-expansion-panel-header');
    return header && !header.disabled && !ticketplusSoldOut(panel) && /熱賣中|剩餘\s*[1-9]\d*/.test(header.textContent);
  }) || [...document.querySelectorAll('.count-button')].some(count => {
    const row = count.closest('.row');
    const controls = row && ticketplusCount(row);
    return controls && !ticketplusSoldOut(row) && !controls.plus.disabled;
  });
}

// Browsers require a real user gesture before audio can start.
document.addEventListener('pointerdown', () => {
  const Audio = globalThis.AudioContext;
  if (!Audio) return;
  try {
    ticketplusAudio ??= new Audio();
    if (ticketplusAudio.state === 'suspended') ticketplusAudio.resume().catch(() => {});
  } catch (error) { console.warn('TikiTiki: 提示音暫時無法播放', error); }
}, true);

function ticketplusNotify() {
  const stock = location.pathname.startsWith('/order/') && ticketplusHasStock();
  if (!stock) { ticketplusStockAnnounced = false; return; }
  if (ticketplusStockAnnounced || ticketplusAudio?.state !== 'running') return;
  ticketplusStockAnnounced = true;
  playTikitikiDing(ticketplusAudio, ticketplusSettings.TicketplusSoundVolume);
}

function ticketplusNextAllowed() {
  if (!location.pathname.startsWith('/order/') || !ticketplusSettings) return false;
  if (!ticketplusSettings.TicketplusNextOnlySpecified) return true;
  try {
    const url = new URL(ticketplusSettings.TicketplusNextUrl.trim());
    return url.origin === 'https://ticketplus.com.tw' && /^\/order\/[^/]+\/[^/]+\/?$/.test(url.pathname) &&
      url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
  } catch { return false; }
}

function ticketplusNext() {
  const allowed = ticketplusNextAllowed();
  const status = document.getElementById('tikitikiNextStatus');
  if (status) {
    const text = allowed ? '自動下一步：適用此頁' : '自動下一步：此頁未啟用';
    if (status.textContent !== text) status.textContent = text;
  }
  if (!allowed) return;
  const run = ticketplusRun;
  if (!ticketplusSettings?.TicketplusAutoSelect || !run.done || !run.selected || run.advanced) return;
  const counts = [...document.querySelectorAll('.count-button')];
  if (!counts.includes(run.selected) || Number(run.selected.children[1]?.textContent.trim()) <= 0) return;
  const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === '下一步');
  if (!button || button.disabled || !button.getClientRects().length) return;
  run.advanced = true;
  button.click();
}

function ticketplusRefresh(now = Date.now()) {
  const countdown = document.getElementById('tikitikiRefreshCountdown');
  const show = text => { if (countdown && countdown.textContent !== text) countdown.textContent = text; };
  if (!location.pathname.startsWith('/order/') || !ticketplusSettings?.TicketplusAutoSelect) {
    ticketplusNextRefresh = 0;
    show('自動更新已關閉');
    return;
  }
  const selected = [...document.querySelectorAll('.count-button')]
    .some(count => Number(count.children[1]?.textContent.trim()) > 0);
  if (ticketplusRun.done || selected) {
    ticketplusNextRefresh = 0;
    show('自動更新已暫停');
    return;
  }
  const available = ticketplusHasStock();
  if (available) {
    ticketplusNextRefresh = 0;
    show('偵測到有票，暫停更新');
    return;
  }
  const button = [...document.querySelectorAll('button')].find(button => /更新票數/.test(button.textContent));
  if (!button || button.disabled) {
    ticketplusNextRefresh = 0;
    show('等待更新票數按鈕');
    return;
  }
  const seconds = (key, fallback) => {
    const value = Number(ticketplusSettings[key]);
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
  };
  const min = seconds('TicketplusRefreshMin', 4);
  const max = Math.max(min, seconds('TicketplusRefreshMax', 8));
  const nextRefresh = () => now + (min + Math.floor(Math.random() * (max - min + 1))) * 1000;
  if (!ticketplusNextRefresh) ticketplusNextRefresh = nextRefresh();
  if (now >= ticketplusNextRefresh) {
    ticketplusRun.refreshAt = now;
    delete ticketplusRun.failed;
    delete ticketplusRun.opened;
    button.click();
    ticketplusNextRefresh = nextRefresh();
  }
  show(`更新票數：${Math.ceil((ticketplusNextRefresh - now) / 1000)} 秒`);
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
    if (key === 'TicketplusRefreshMin' || key === 'TicketplusRefreshMax') {
      ticketplusNextRefresh = 0;
      continue;
    }
    if (!['TicketplusSerialNumber', 'TicketplusNextOnlySpecified', 'TicketplusNextUrl', 'TicketplusSoundVolume'].includes(key)) changed = true;
  }
  if (changed) {
    ticketplusRun = {};
    ticketplusNextRefresh = 0;
  }
  updateTicketplus();
});
setInterval(() => {
  updateTicketplus();
  ticketplusNotify();
  ticketplusNext();
  ticketplusRefresh();
}, 200);
addClockWidget(undefined, 'TicketplusAutoSelect');
