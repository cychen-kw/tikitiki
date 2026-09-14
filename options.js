// Saves options to browser.storage
function save_options() {
    var ProgramOnly = document.getElementById('ProgramOnly').checked;
    var TicketNumber = document.querySelector('input[name="TicketNumber"]:checked').value;
    var HideBadArea = document.getElementById('HideBadArea').checked;
    var HideDisabledArea = document.getElementById('HideDisabledArea').checked;
    var HideSoldOutArea = document.getElementById('HideSoldOutArea').checked;
    var ShowOnlyArea = document.getElementById('ShowOnlyArea').checked;
    var AreaName = document.getElementById('AreaName').value;
    var AutoClickArea = document.getElementById('AutoClickArea').checked;
    var AutoClickAreaName = document.getElementById('AutoClickAreaName').value;
    var AutoClickTieBreak = document.querySelector('input[name="AutoClickTieBreak"]:checked').value;
    var AutoClickAllowInsufficient = document.getElementById('AutoClickAllowInsufficient').checked;
    var VerifyCode = document.getElementById('VerifyCode').value;
    var KktixAutoSelect = document.getElementById('KktixAutoSelect').checked;
    var KktixTicketNumber = document.querySelector('input[name="KktixTicketNumber"]:checked').value;
    var KktixQualificationCode = document.getElementById('KktixQualificationCode').value;

    chrome.storage.local.set({
        ProgramOnly,
        TicketNumber,
        HideBadArea,
        HideDisabledArea,
        HideSoldOutArea,
        ShowOnlyArea,
        AreaName,
        AutoClickArea,
        AutoClickAreaName,
        AutoClickTieBreak,
        AutoClickAllowInsufficient,
        VerifyCode,
        KktixAutoSelect,
        KktixTicketNumber,
        KktixQualificationCode
    }).then(() => {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 750);
    });
}
// Restores select box and checkbox state using the preferences stored in browser.storage.
function restore_options() {
    renderKktixScope();
    chrome.storage.local.get({
        ProgramOnly: false,
        TicketNumber: 0,
        HideBadArea: false,
        HideDisabledArea: false,
        HideSoldOutArea: true,
        ShowOnlyArea: false,
        AreaName: "",
        AutoClickArea: false,
        AutoClickAreaName: "",
        AutoClickTieBreak: "keyword",
        AutoClickAllowInsufficient: false,
        VerifyCode: "",
        KktixAutoSelect: false,
        KktixTicketNumber: "2",
        KktixQualificationCode: ""
    }).then(items => {
        document.getElementById('ProgramOnly').checked = items.ProgramOnly;
        let ticketRadio = document.querySelector('input[name="TicketNumber"][value="' + items.TicketNumber + '"]');
        if (ticketRadio) ticketRadio.checked = true;
        document.getElementById('HideBadArea').checked = items.HideBadArea;
        document.getElementById('HideDisabledArea').checked = items.HideDisabledArea;
        document.getElementById('HideSoldOutArea').checked = items.HideSoldOutArea;
        document.getElementById('ShowOnlyArea').checked = items.ShowOnlyArea;
        renderTags('AreaNameBox', 'AreaNameInput', 'AreaName', items.AreaName ? items.AreaName.split(',') : []);
        document.getElementById('AutoClickArea').checked = items.AutoClickArea;
        renderTags('AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName', items.AutoClickAreaName ? items.AutoClickAreaName.split(',') : []);
        let tieBreakRadio = document.querySelector('input[name="AutoClickTieBreak"][value="' + items.AutoClickTieBreak + '"]');
        if (tieBreakRadio) tieBreakRadio.checked = true;
        document.getElementById('AutoClickAllowInsufficient').checked = items.AutoClickAllowInsufficient;
        document.getElementById('VerifyCode').value = items.VerifyCode;
        document.getElementById('KktixAutoSelect').checked = items.KktixAutoSelect;
        let kktixRadio = document.querySelector('input[name="KktixTicketNumber"][value="' + items.KktixTicketNumber + '"]');
        if (kktixRadio) kktixRadio.checked = true;
        document.getElementById('KktixQualificationCode').value = items.KktixQualificationCode;
    });
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
            for (const id of ids) {
                if (typeof id !== 'string') continue;
                const info = items[key.replace('KktixTicketScope:', 'KktixTicketInfo:') + ':' + id];
                const row = document.createElement('tr');
                for (const value of [id, info?.eventName || key.slice('KktixTicketScope:'.length), info?.ticketName || '重新開啟報名頁後補上名稱']) {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
                const cell = document.createElement('td');
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'clear-btn';
                remove.textContent = '刪除';
                remove.setAttribute('aria-label', `刪除 ${info?.eventName || key.slice('KktixTicketScope:'.length)} ${info?.ticketName || id}`);
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
            if (!key || key === scopeKey) updates[scopeKey] = key ? ids.filter(value => value !== id) : [];
        }
        await chrome.storage.local.set(updates);
        await renderKktixScope();
    } catch (error) {
        document.getElementById('KktixScopeStatus').textContent = '刪除失敗，請重試。';
        console.error(error);
    }
}

document.getElementById('KktixScopeClear').addEventListener('click', () => deleteKktixScope());
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.keys(changes).some(key => /^KktixTicket(Scope|Info):/.test(key))) renderKktixScope();
});

// generic keyword tag input: chips are the display, the hidden input stays
// the comma-joined value that save/restore and area.js already expect.
function renderTags(boxId, inputId, hiddenId, tags) {
    let box = document.getElementById(boxId);
    box.querySelectorAll('.tag').forEach(el => el.remove());
    let input = document.getElementById(inputId);

    tags.forEach((tag, index) => {
        let chip = document.createElement('span');
        chip.className = 'tag';
        chip.textContent = tag;

        let remove = document.createElement('span');
        remove.className = 'tag-remove';
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            tags.splice(index, 1);
            renderTags(boxId, inputId, hiddenId, tags);
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
    });
}

function setupClearButton(clearBtnId, boxId, inputId, hiddenId) {
    document.getElementById(clearBtnId).addEventListener('click', () => {
        renderTags(boxId, inputId, hiddenId, []);
    });
}

setupTagInput('AreaNameBox', 'AreaNameInput', 'AreaName');
setupTagInput('AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName');
setupClearButton('AreaNameClear', 'AreaNameBox', 'AreaNameInput', 'AreaName');
setupClearButton('AutoClickAreaNameClear', 'AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName');

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('ver').textContent = " v" + chrome.runtime.getManifest().version;

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('main.sections').forEach(main => {
            main.hidden = main.id !== 'tab-' + btn.dataset.tab;
        });
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
