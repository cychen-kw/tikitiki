// Use the site's controls and their normal event handlers; never submit Next.
const ibonDefaults = { IbonAutoSelect: false, IbonAreaName: '', IbonTicketNumber: '2', IbonAllowSeparated: false };
let ibonSettings;
let ibonAreaClicked = false;
let ibonHandled = new WeakSet();

function updateIbon() {
  if (!ibonSettings?.IbonAutoSelect) return;
  if (location.pathname.endsWith('/UTK0201_000.aspx')) {
    if (ibonAreaClicked) return;
    const keywords = String(ibonSettings.IbonAreaName).split(',').map(word => word.trim()).filter(Boolean);
    if (!keywords.length) return;
    // The clickable list lives in a closed shadow root; the image-map links are inactive.
    const table = document.getElementById('AreaTable');
    if (!table) return;
    const roots = [table, ...[...table.children].map(child => chrome.dom.openOrClosedShadowRoot(child)).filter(Boolean)];
    const areas = roots.flatMap(root => [...root.querySelectorAll('tr[id][rel]')]).filter(row =>
      !row.classList.contains('disabled') && row.querySelector('[data-title="票區"]') &&
      !/已售完|未開賣/.test(row.textContent));
    const chosen = keywords.map(keyword => areas.find(row => row.querySelector('[data-title="票區"]').textContent.includes(keyword))).find(Boolean);
    if (!chosen) return;
    const computer = document.getElementById('ctl00_ContentPlaceHolder1_BUY_TYPE_2');
    if (!computer || computer.disabled) return;
    if (!computer.checked) {
      if (!ibonHandled.has(computer)) {
        ibonHandled.add(computer);
        computer.click();
      }
      return;
    }
    ibonAreaClicked = true;
    chosen.click();
    return;
  }
  if (!location.pathname.endsWith('/UTK0201_001.aspx')) return;
  const selects = [...document.querySelectorAll('select[id^="ctl00_ContentPlaceHolder1_DataGrid_"][id$="_AMOUNT_DDL"]')];
  if (selects.length !== 1) return; // Multiple ticket types require the user's choice.
  const select = selects[0];
  if (select.disabled || ibonHandled.has(select)) return;
  const target = Number(ibonSettings.IbonTicketNumber);
  if (!Number.isInteger(target) || target < 0 || target > 4) return;
  const options = [...select.options].filter(option => !option.disabled && Number.isInteger(Number(option.value)) && Number(option.value) > 0);
  const chosen = target === 0 ? options.sort((a, b) => Number(b.value) - Number(a.value))[0] : options.find(option => Number(option.value) === target);
  if (!chosen) return;
  const separated = document.getElementById('ctl00_ContentPlaceHolder1_notConsecutive');
  if (separated && separated.checked !== Boolean(ibonSettings.IbonAllowSeparated)) {
    if (separated.disabled) return;
    if (!ibonHandled.has(separated)) {
      ibonHandled.add(separated);
      separated.click();
    }
    return;
  }
  ibonHandled.add(select);
  if (select.value !== chosen.value) {
    select.focus();
    select.value = chosen.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

chrome.storage.local.get(ibonDefaults).then(items => {
  ibonSettings = items;
  updateIbon();
}).catch(error => console.error('TikiTiki: 無法讀取 ibon 設定', error));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !ibonSettings) return;
  let changed = false;
  for (const key of Object.keys(ibonDefaults)) {
    if (!changes[key]) continue;
    ibonSettings[key] = changes[key].newValue ?? ibonDefaults[key];
    changed = true;
  }
  if (!changed) return;
  ibonAreaClicked = false;
  ibonHandled = new WeakSet();
  updateIbon();
});
setInterval(updateIbon, 300);
addClockWidget(undefined, 'IbonAutoSelect');
