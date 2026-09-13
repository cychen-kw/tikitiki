// Saves options to browser.storage
function save_options() {
    var ProgramOnly = document.getElementById('ProgramOnly').checked;
    var TicketNumber = document.querySelector('input[name="TicketNumber"]:checked').value;
    var HideBadArea = document.getElementById('HideBadArea').checked;
    var HideDisabledArea = document.getElementById('HideDisabledArea').checked;
    var ShowOnlyArea = document.getElementById('ShowOnlyArea').checked;
    var AreaName = document.getElementById('AreaName').value;
    var AutoClickArea = document.getElementById('AutoClickArea').checked;
    var AutoClickAreaName = document.getElementById('AutoClickAreaName').value;
    var AutoClickTieBreak = document.querySelector('input[name="AutoClickTieBreak"]:checked').value;
    var AutoClickAllowInsufficient = document.getElementById('AutoClickAllowInsufficient').checked;
    var WidgetEnabled = document.getElementById('WidgetEnabled').checked;
    var VerifyCode = document.getElementById('VerifyCode').value;

    chrome.storage.local.set({
        ProgramOnly,
        TicketNumber,
        HideBadArea,
        HideDisabledArea,
        ShowOnlyArea,
        AreaName,
        AutoClickArea,
        AutoClickAreaName,
        AutoClickTieBreak,
        AutoClickAllowInsufficient,
        WidgetEnabled,
        VerifyCode
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
    chrome.storage.local.get({
        ProgramOnly: false,
        TicketNumber: 0,
        HideBadArea: false,
        HideDisabledArea: false,
        ShowOnlyArea: false,
        AreaName: "",
        AutoClickArea: false,
        AutoClickAreaName: "",
        AutoClickTieBreak: "keyword",
        AutoClickAllowInsufficient: false,
        WidgetEnabled: true,
        VerifyCode: ""
    }).then(items => {
        document.getElementById('ProgramOnly').checked = items.ProgramOnly;
        let ticketRadio = document.querySelector('input[name="TicketNumber"][value="' + items.TicketNumber + '"]');
        if (ticketRadio) ticketRadio.checked = true;
        document.getElementById('HideBadArea').checked = items.HideBadArea;
        document.getElementById('HideDisabledArea').checked = items.HideDisabledArea;
        document.getElementById('ShowOnlyArea').checked = items.ShowOnlyArea;
        renderTags('AreaNameBox', 'AreaNameInput', 'AreaName', items.AreaName ? items.AreaName.split(',') : []);
        document.getElementById('AutoClickArea').checked = items.AutoClickArea;
        renderTags('AutoClickAreaNameBox', 'AutoClickAreaNameInput', 'AutoClickAreaName', items.AutoClickAreaName ? items.AutoClickAreaName.split(',') : []);
        let tieBreakRadio = document.querySelector('input[name="AutoClickTieBreak"][value="' + items.AutoClickTieBreak + '"]');
        if (tieBreakRadio) tieBreakRadio.checked = true;
        document.getElementById('AutoClickAllowInsufficient').checked = items.AutoClickAllowInsufficient;
        document.getElementById('WidgetEnabled').checked = items.WidgetEnabled;
        document.getElementById('VerifyCode').value = items.VerifyCode;
    });
}

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
