addClockWidget(undefined, 'KktixAutoSelect');

// auto-agree to terms & privacy policy checkbox on the KKTIX registration page.
// Angular can re-render/reset the checkbox after our click (e.g. once it finishes
// bootstrapping and applies its own model state), and that reset is a plain
// property change that MutationObserver won't catch. So instead of clicking once,
// keep re-checking for a while and re-click whenever it drifts back to unchecked.
let attempts = 0;
let poll = setInterval(() => {
  attempts++;
  let checkbox = document.getElementById("person_agree_terms");
  if (checkbox && !checkbox.checked) {
    checkbox.click(); // real click so AngularJS's ng-model picks it up
  }
  if (attempts >= 20) clearInterval(poll); // give up after ~10s
}, 500);

// One click at a time so Angular can update the quantity and purchase limits.
function kktixSelectStep(input, plus, target, state, now) {
  const quantity = Number(input.value);
  if (state.done || input.value.trim() === "" || !Number.isInteger(quantity) || quantity < 0) return;
  if (state.before !== undefined) {
    if (quantity <= state.before) {
      if (now - state.clickedAt >= 1500) state.done = true;
      return;
    }
    delete state.before;
  }
  if ((target > 0 && quantity >= target) || plus.disabled ||
      plus.classList.contains("disabled") || plus.getAttribute("aria-disabled") === "true") {
    state.done = true;
    return;
  }
  state.before = quantity;
  state.clickedAt = now;
  plus.click();
}

const kktixScopeKey = "KktixTicketScope:" + location.pathname.split("/")[2];
const kktixDefaults = { KktixAutoSelect: false, KktixTicketNumber: "2", KktixQualificationCode: "", KktixTieBreak: "top", KktixAllowInsufficient: false, KktixHideDisabledArea: false, [kktixScopeKey]: [] };
let kktixSettings;
let kktixActiveId;
let kktixRun = {};
const kktixSavedInfo = new Set();
const kktixFilledCodes = new WeakSet();
const kktixHiddenUnits = new WeakMap();

function kktixChoices(row) {
  try {
    const values = JSON.parse(row.closest('.ticket-unit').dataset.tikitikiQuantities);
    if (Array.isArray(values) && values.every(n => Number.isSafeInteger(n) && n >= 0)) return values;
  } catch { /* Wait for the page-world script to publish the ticket model. */ }
  return [];
}

function kktixCandidates(rows, ids, target, order, allowInsufficient) {
  return rows.map((row, domIndex) => {
    const choices = kktixChoices(row);
    const max = Math.max(0, ...choices);
    const goal = target === 0 ? max : choices.includes(target) ? target :
      allowInsufficient ? Math.max(0, ...choices.filter(n => n <= target)) : 0;
    return { row, domIndex, max, goal, rank: ids.indexOf(row.id), rand: Math.random() };
  }).filter(c => c.rank >= 0 && c.goal > 0).sort((a, b) => {
    switch (order) {
      case 'bottom': return b.domIndex - a.domIndex;
      case 'selected': return a.rank - b.rank;
      case 'random': return a.rand - b.rand;
      case 'remaining': return b.max - a.max || a.rand - b.rand;
      default: return a.domIndex - b.domIndex;
    }
  });
}

function fillKktixQualificationCode(input, code) {
  if (typeof code !== 'string' || !code || input.value || input.disabled || input.readOnly ||
      !input.getClientRects().length || kktixFilledCodes.has(input)) return;
  input.value = code;
  kktixFilledCodes.add(input);
  // Angular's ng-model listens for input; assigning value alone is not enough.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function updateKktixTickets() {
  if (!kktixSettings) return;
  for (const input of document.querySelectorAll('.ticket-unit input.member-code')) {
    const quantity = input.closest('.ticket-unit').querySelector('input[ng-model="ticketModel.quantity"]');
    if (Number(quantity?.value) > 0) fillKktixQualificationCode(input, kktixSettings.KktixQualificationCode);
  }
  const ids = kktixSettings[kktixScopeKey];
  const rows = [...document.querySelectorAll('.ticket-unit [id^="ticket_"]')];
  for (const row of rows) {
    const name = row.querySelector(".ticket-name");
    if (!name) continue;
    const unit = row.closest('.ticket-unit');
    const hide = kktixSettings.KktixHideDisabledArea && /身障|身心障礙|輪椅/.test(name.textContent);
    if (hide) {
      if (!kktixHiddenUnits.has(unit)) kktixHiddenUnits.set(unit, unit.style.display);
      unit.style.display = 'none';
    } else if (kktixHiddenUnits.has(unit)) {
      unit.style.display = kktixHiddenUnits.get(unit);
      kktixHiddenUnits.delete(unit);
    }
    let toggle = row.querySelector(".tikitiki-ticket-scope");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tikitiki-ticket-scope";
      toggle.style.cssText = "margin-left:8px;min-width:26px;min-height:26px;padding:0 5px;border:1px solid #16824b;border-radius:50%;font-size:16px;cursor:pointer;vertical-align:middle;";
      const label = name.textContent.trim();
      toggle.dataset.ticketName = label;
      toggle.setAttribute("aria-label", label + "：加入或移出自動點擊範圍");
      toggle.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        toggle.disabled = true;
        const selected = kktixSettings[kktixScopeKey];
        const next = selected.includes(row.id) ? selected.filter(id => id !== row.id) : [...selected, row.id];
        try {
          await chrome.storage.local.set({ [kktixScopeKey]: next });
        } catch (error) {
          toggle.title = "範圍儲存失敗，請重試";
          console.error("TikiTiki: 無法儲存票種範圍", error);
        } finally {
          toggle.disabled = false;
        }
      });
      name.appendChild(toggle);
    }
    const selected = ids.includes(row.id);
    if (!selected) kktixSavedInfo.delete(row.id);
    const eventName = document.querySelector('.event-name, .event-title, h1:not(.logo)')?.textContent.trim();
    if (selected && eventName && !kktixSavedInfo.has(row.id)) {
      kktixSavedInfo.add(row.id);
      const infoKey = kktixScopeKey.replace('KktixTicketScope:', 'KktixTicketInfo:') + ':' + row.id;
      chrome.storage.local.set({ [infoKey]: { eventName, ticketName: toggle.dataset.ticketName } })
        .catch(error => {
          kktixSavedInfo.delete(row.id);
          console.error('TikiTiki: 無法儲存票種名稱', error);
        });
    }
    const caption = selected ? `✓ ${ids.indexOf(row.id) + 1}` : '＋';
    if (toggle.textContent === caption) continue;
    toggle.textContent = caption;
    toggle.title = selected ? `加入順序 ${ids.indexOf(row.id) + 1}；點擊移除` : "加入自動點擊範圍";
    toggle.setAttribute('aria-label', toggle.dataset.ticketName + '：' + toggle.title);
    toggle.setAttribute("aria-pressed", String(selected));
    toggle.style.background = selected ? "#16824b" : "#fff";
    toggle.style.color = selected ? "#fff" : "#16824b";
  }
  if (!kktixSettings.KktixAutoSelect || kktixRun.done) return;
  const target = Number(kktixSettings.KktixTicketNumber);
  if (!Number.isInteger(target) || target < 0 || target > 4) return;
  const candidates = kktixCandidates(rows, ids, target, kktixSettings.KktixTieBreak, kktixSettings.KktixAllowInsufficient);
  for (const { row, goal } of candidates) {
    if (kktixHiddenUnits.has(row.closest('.ticket-unit'))) continue;
    if (kktixActiveId && row.id !== kktixActiveId) continue;
    const input = row.querySelector('input[type="text"], input[type="number"]');
    const plus = row.querySelector("button.plus");
    if (!input || input.disabled || !plus || !input.getClientRects().length) continue;
    if (!kktixActiveId && plus.disabled && Number(input.value) === 0) continue;
    // Leave an existing selection in another row for the user to review.
    if (rows.some(other => other !== row && Number(other.querySelector("input")?.value) > 0)) return;
    if (!kktixActiveId) {
      kktixActiveId = row.id;
    }
    const next = kktixChoices(row).filter(n => n > Number(input.value)).sort((a, b) => a - b)[0];
    if (next > goal && Number(input.value) < goal) { kktixRun.done = true; return; }
    kktixSelectStep(input, plus, goal, kktixRun, Date.now());
    break;
  }
}

chrome.storage.local.get(kktixDefaults).then(items => {
  kktixSettings = items;
  if (!Array.isArray(items[kktixScopeKey])) items[kktixScopeKey] = [];
  updateKktixTickets();
}).catch(error => console.error("TikiTiki: 無法讀取 KKTIX 設定", error));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !kktixSettings) return;
  let changed = false;
  for (const key of Object.keys(kktixDefaults)) {
    if (!changes[key]) continue;
    kktixSettings[key] = changes[key].newValue ?? kktixDefaults[key];
    if (key !== 'KktixQualificationCode') changed = true;
  }
  if (!changed) {
    if (changes.KktixQualificationCode) updateKktixTickets();
    return;
  }
  if (!Array.isArray(kktixSettings[kktixScopeKey])) kktixSettings[kktixScopeKey] = [];
  kktixActiveId = undefined;
  kktixRun = {};
  updateKktixTickets();
});

// Angular also changes plain input/disabled properties without DOM mutations.
setInterval(updateKktixTickets, 300);
