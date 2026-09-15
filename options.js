const optionDefaults = {
    ProgramOnly: false, TicketNumber: 0, HideBadArea: false, HideDisabledArea: false,
    HideSoldOutArea: true, ShowOnlyArea: false, AreaName: "", AutoClickArea: false,
    AutoClickAreaName: "", AutoClickTieBreak: "keyword", AutoClickAllowInsufficient: false,
    VerifyCode: "", KktixAutoSelect: false, KktixTicketNumber: "2", KktixQualificationCode: "",
    KktixTieBreak: "top", KktixAllowInsufficient: false, KktixHideDisabledArea: false,
    IbonAutoSelect: false, IbonAreaName: '', IbonTicketNumber: '2', IbonAllowSeparated: false
};
let optionsReady = false;
let statusTimer;
let saveQueue = Promise.resolve();

function applyOption(key, value) {
    if (['AreaName', 'AutoClickAreaName', 'IbonAreaName'].includes(key)) {
        renderTags(key + 'Box', key + 'Input', key, value ? value.split(',') : []);
        return;
    }
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
        if (radio.name === key) radio.checked = String(value) === radio.value;
    }
    const input = document.getElementById(key);
    if (input) {
        if (optionsReady && input.type === 'text' && document.activeElement === input) return;
        if (input.type === 'checkbox') input.checked = value;
        else input.value = value;
    }
}

// Save only the edited field so another tab's settings cannot be overwritten.
function saveOption(key, value) {
    if (!optionsReady || !Object.hasOwn(optionDefaults, key)) return Promise.resolve();
    const status = document.getElementById('status');
    clearTimeout(statusTimer);
    status.textContent = '儲存中…';
    saveQueue = saveQueue.then(() => chrome.storage.local.set({ [key]: value })).then(() => {
        status.textContent = '設定已儲存';
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => { status.textContent = ''; }, 1000);
    }).catch(error => {
        clearTimeout(statusTimer);
        status.textContent = '儲存失敗，請重新修改該設定以重試。';
        console.error(error);
    });
    return saveQueue;
}

async function restore_options() {
    renderKktixScope();
    try {
        const items = await chrome.storage.local.get({ ...optionDefaults, OptionsLastTab: 'tixcraft' });
        if (!tabChanged) {
            const sourceTab = typeof location === 'undefined' ? '' : location.hash.slice(1);
            const explicitTab = ['tixcraft', 'kktix', 'ibon'].includes(sourceTab);
            selectTab(explicitTab ? sourceTab : items.OptionsLastTab);
            if (explicitTab) {
                chrome.storage.local.set({ OptionsLastTab: sourceTab }).catch(error => {
                    document.getElementById('status').textContent = '分頁記錄儲存失敗，請重試。';
                    console.error(error);
                });
            }
        }
        for (const key of Object.keys(optionDefaults)) applyOption(key, items[key]);
        optionsReady = true;
        document.querySelectorAll('main input, main button').forEach(input => {
            if (input.id !== 'KktixScopeClear') input.disabled = false;
        });
    } catch (error) {
        document.getElementById('status').textContent = '讀取設定失敗，請重新開啟設定頁。';
        console.error(error);
    }
}

async function renderKktixScope() {
    const status = document.getElementById('KktixScopeStatus');
    try {
        const items = await chrome.storage.local.get(null);
        const body = document.getElementById('KktixScopeList');
        body.replaceChildren();
        let count = 0;
        for (const [key, ids] of Object.entries(items)) {
            if (!key.startsWith('KktixTicketScope:') || !Array.isArray(ids)) continue;
            const tickets = ids.filter(id => typeof id === 'string');
            if (!tickets.length) continue;
            const eventId = key.slice('KktixTicketScope:'.length);
            const eventName = tickets.map(id => items['KktixTicketInfo:' + eventId + ':' + id]?.eventName).find(Boolean) || eventId;
            const group = document.createElement('tr');
            group.className = 'scope-group';
            const heading = document.createElement('th');
            heading.colSpan = 3;
            heading.setAttribute('scope', 'rowgroup');
            const title = document.createElement('a');
            title.textContent = `${eventName}（${tickets.length} 個票種）`;
            title.href = 'https://kktix.com/events/' + encodeURIComponent(eventId) + '/registrations/new';
            title.target = '_blank';
            title.rel = 'noopener noreferrer';
            heading.appendChild(title);
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'clear-btn';
            clear.textContent = '清空此活動';
            clear.setAttribute('aria-label', '清空 ' + eventName);
            clear.addEventListener('click', () => deleteKktixScope(key));
            heading.appendChild(clear);
            group.appendChild(heading);
            body.appendChild(group);
            let draggedId = null;
            for (const [index, id] of tickets.entries()) {
                const info = items[key.replace('KktixTicketScope:', 'KktixTicketInfo:') + ':' + id];
                const row = document.createElement('tr');
                for (const value of [index + 1]) {
                    const cell = document.createElement('td');
                    cell.className = 'scope-order';
                    cell.textContent = value;
                    row.appendChild(cell);
                }
                const handle = document.createElement('button');
                handle.type = 'button';
                handle.className = 'clear-btn scope-drag';
                handle.textContent = '⠿';
                handle.draggable = true;
                handle.title = '拖曳排序，或按 Alt + 上下方向鍵移動';
                handle.setAttribute('aria-label', '移動 ' + (info?.ticketName || id));
                row.children[0].appendChild(handle);
                handle.addEventListener('dragstart', event => {
                    draggedId = id;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', id);
                });
                handle.addEventListener('dragend', () => { draggedId = null; });
                row.addEventListener('dragover', event => {
                    if (draggedId === null) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                });
                row.addEventListener('drop', event => {
                    if (draggedId === null) return;
                    event.preventDefault();
                    const source = draggedId;
                    draggedId = null;
                    return moveKktixScope(key, source, id);
                });
                handle.addEventListener('keydown', event => {
                    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
                    event.preventDefault();
                    const target = tickets[index + (event.key === 'ArrowUp' ? -1 : 1)];
                    if (target) return moveKktixScope(key, id, target);
                });
                const nameCell = document.createElement('td');
                nameCell.textContent = info?.ticketName || '重新開啟報名頁後補上名稱';
                const ticketId = document.createElement('small');
                ticketId.className = 'scope-ticket-id';
                ticketId.textContent = id;
                nameCell.appendChild(ticketId);
                row.appendChild(nameCell);
                const cell = document.createElement('td');
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'clear-btn';
                remove.textContent = '×';
                remove.title = '移除票種';
                remove.setAttribute('aria-label', `移除 ${info?.eventName || key.slice('KktixTicketScope:'.length)} ${info?.ticketName || id}`);
                remove.addEventListener('click', () => deleteKktixScope(key, id));
                cell.appendChild(remove);
                row.appendChild(cell);
                body.appendChild(row);
                count++;
            }
        }
        document.getElementById('KktixScopeClear').disabled = count === 0;
        status.textContent = count ? `已加入 ${count} 個票種` : '尚未加入任何票種';
    } catch (error) {
        status.textContent = '讀取清單失敗，請重新開啟設定頁。';
        console.error(error);
    }
}

async function deleteKktixScope(key, id) {
    try {
        const items = await chrome.storage.local.get(null);
        const updates = {};
        for (const [scopeKey, ids] of Object.entries(items)) {
            if (!scopeKey.startsWith('KktixTicketScope:') || !Array.isArray(ids)) continue;
            if (!key || key === scopeKey) updates[scopeKey] = key && id !== undefined ? ids.filter(value => value !== id) : [];
        }
        await chrome.storage.local.set(updates);
        await renderKktixScope();
    } catch (error) {
        document.getElementById('KktixScopeStatus').textContent = '移除失敗，請重試。';
        console.error(error);
    }
}

async function moveKktixScope(key, id, targetId) {
    try {
        const items = await chrome.storage.local.get(key);
        const ids = items[key];
        if (!Array.isArray(ids)) return;
        const from = ids.indexOf(id), to = ids.indexOf(targetId);
        if (from < 0 || to < 0 || from === to) return;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        await chrome.storage.local.set({ [key]: ids });
        await renderKktixScope();
    } catch (error) {
        document.getElementById('KktixScopeStatus').textContent = '排序儲存失敗，請重試。';
        console.error(error);
    }
}

document.getElementById('KktixScopeClear').addEventListener('click', () => deleteKktixScope());
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && optionsReady) {
        for (const [key, change] of Object.entries(changes)) {
            if (Object.hasOwn(optionDefaults, key)) applyOption(key, change.newValue ?? optionDefaults[key]);
        }
    }
    if (area === 'local' && Object.keys(changes).some(key => /^KktixTicket(Scope|Info):/.test(key))) renderKktixScope();
});

// generic keyword tag input: chips are the display, the hidden input stays
// the comma-joined value that save/restore and area.js already expect.
function renderTags(boxId, inputId, hiddenId, tags) {
    let box = document.getElementById(boxId);
    box.querySelectorAll('.tag').forEach(el => el.remove());
    let input = document.getElementById(inputId);
    let draggedIndex = null;
    function moveTag(from, to) {
        if (from === to || to < 0 || to >= tags.length) return;
        tags.splice(to, 0, tags.splice(from, 1)[0]);
        renderTags(boxId, inputId, hiddenId, tags);
        saveOption(hiddenId, tags.join(','));
        box.querySelectorAll('.tag')[to]?.focus();
    }

    tags.forEach((tag, index) => {
        let chip = document.createElement('span');
        chip.className = 'tag';
        chip.textContent = tag;
        if (['AutoClickAreaName', 'IbonAreaName'].includes(hiddenId)) {
            chip.draggable = true;
            chip.tabIndex = 0;
            chip.title = '拖曳換順序，或按 Alt + 左右方向鍵移動';
            chip.addEventListener('dragstart', event => {
                draggedIndex = index;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tag);
            });
            chip.addEventListener('dragover', event => {
                if (draggedIndex === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            });
            chip.addEventListener('drop', event => {
                if (draggedIndex === null) return;
                event.preventDefault();
                moveTag(draggedIndex, index);
                draggedIndex = null;
            });
            chip.addEventListener('dragend', () => { draggedIndex = null; });
            chip.addEventListener('keydown', event => {
                if (event.target !== chip || !event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                event.preventDefault();
                moveTag(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
            });
        }

        let remove = document.createElement('button');
        remove.type = 'button';
        remove.setAttribute('aria-label', '移除 ' + tag);
        remove.className = 'tag-remove';
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            tags.splice(index, 1);
            renderTags(boxId, inputId, hiddenId, tags);
            saveOption(hiddenId, tags.join(','));
        });

        chip.appendChild(remove);
        box.insertBefore(chip, input);
    });

    document.getElementById(hiddenId).value = tags.join(',');
}

function setupTagInput(boxId, inputId, hiddenId) {
    document.getElementById(inputId).addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();

        let value = e.target.value.trim();
        e.target.value = '';
        if (!value) return;

        let tags = document.getElementById(hiddenId).value.split(',').filter(Boolean);
        tags.push(value);
        renderTags(boxId, inputId, hiddenId, tags);
        saveOption(hiddenId, tags.join(','));
    });
}

function setupClearButton(clearBtnId, boxId, inputId, hiddenId) {
    document.getElementById(clearBtnId).addEventListener('click', () => {
        renderTags(boxId, inputId, hiddenId, []);
        document.getElementById(inputId).value = '';
        saveOption(hiddenId, '');
    });
}

setupTagInput('AreaNameBox', 'AreaNameInput', 'AreaName');
setupTagInput('AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName');
setupClearButton('AreaNameClear', 'AreaNameBox', 'AreaNameInput', 'AreaName');
setupClearButton('AutoClickAreaNameClear', 'AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName');
setupTagInput('IbonAreaNameBox', 'IbonAreaNameInput', 'IbonAreaName');
setupClearButton('IbonAreaNameClear', 'IbonAreaNameBox', 'IbonAreaNameInput', 'IbonAreaName');

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelectorAll('main input, main button').forEach(input => { input.disabled = true; });
document.addEventListener('change', event => {
    const input = event.target;
    if (input.type === 'checkbox') saveOption(input.id, input.checked);
    if (input.type === 'radio' && input.checked) saveOption(input.name, input.value);
});
document.addEventListener('input', event => {
    const input = event.target;
    if (input.type === 'text' && !event.isComposing) saveOption(input.id, input.value);
});
document.addEventListener('compositionend', event => {
    const input = event.target;
    if (input.type === 'text') saveOption(input.id, input.value);
});
document.getElementById('ver').textContent = " v" + chrome.runtime.getManifest().version;

let tabChanged = false;
function selectTab(tab) {
    if (!['tixcraft', 'kktix', 'ibon'].includes(tab)) tab = 'tixcraft';
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('main.sections').forEach(main => {
        main.hidden = main.id !== 'tab-' + tab;
    });
}
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        tabChanged = true;
        selectTab(btn.dataset.tab);
        try {
            await chrome.storage.local.set({ OptionsLastTab: btn.dataset.tab });
        } catch (error) {
            document.getElementById('status').textContent = '分頁記錄儲存失敗，請重試。';
            console.error(error);
        }
    });
});

document.getElementById('brandLogo').addEventListener('click', () => {
    let logo = document.getElementById('brandLogo');
    let wrap = document.getElementById('brandLogoWrap');

    logo.classList.remove('shake');
    void logo.offsetWidth; // restart the animation even if clicked again mid-shake
    logo.classList.add('shake');

    for (let i = 0; i < 14; i++) {
        let particle = document.createElement('span');
        particle.className = 'spray-particle';

        let size = 2 + Math.random() * 3;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.top = (35 + Math.random() * 30) + '%';

        // mostly leftward with some vertical scatter, like a mist cone
        let tx = -(14 + Math.random() * 26) + 'px';
        let ty = (Math.random() * 24 - 12) + 'px';
        particle.style.setProperty('--tx', tx);
        particle.style.setProperty('--ty', ty);
        particle.style.animationDelay = (Math.random() * 80) + 'ms';
        particle.style.animationDuration = (0.45 + Math.random() * 0.3) + 's';

        wrap.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
    }

    let bubble = document.createElement('span');
    bubble.className = 'tiki-bubble';
    bubble.textContent = '有票 +1';
    wrap.appendChild(bubble);
    bubble.addEventListener('animationend', () => bubble.remove());
});
