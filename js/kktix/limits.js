// Runs in MAIN world to read KKTIX's Angular model; never changes ticket quantities.
(() => {
  function limitText(scope, unit) {
    const quantity = scope?.ticketModel?.quantity;
    const capacity = scope?.availableCapacity;
    const allowed = scope?.purchasableQuantity;
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(capacity) ||
        !Array.isArray(allowed)) return '可選上限：讀取中';
    const choices = allowed.filter(n => Number.isInteger(n) && n >= 0 && n <= capacity);
    unit.dataset.tikitikiQuantities = JSON.stringify(choices);
    if (scope.busy) return '可選上限：網站處理中';
    if (!choices.length) return '目前無可選張數';
    const max = Math.max(...choices);
    return `票種上限 ${max} 張（本票種已選 ${quantity} 張）`;
  }

  function updateLimits() {
    for (const unit of document.querySelectorAll('.ticket-unit')) {
      let label = unit.querySelector('.tikitiki-ticket-limit');
      if (!label) {
        label = document.createElement('div');
        label.className = 'tikitiki-ticket-limit';
        label.style.cssText = 'font-size:12px;color:#16824b;padding:4px 0;';
        label.title = '依本票種合法張數及上限計算，不扣除其他票種已選張數；並非剩餘庫存。';
        unit.appendChild(label);
      }
      let text = '可選上限：讀取中';
      delete unit.dataset.tikitikiQuantities;
      try {
        const scope = window.angular?.element(unit).scope();
        text = limitText(scope, unit);
      } catch {
        // Angular may be bootstrapping or replacing this ticket's scope.
      }
      if (label.textContent !== text) label.textContent = text;
    }
  }
  updateLimits();
  setInterval(updateLimits, 300);
})();
