// Runs in MAIN world to read KKTIX's Angular model; never changes ticket quantities.
(() => {
  function limitText(scope) {
    const quantity = scope?.ticketModel?.quantity;
    const capacity = scope?.availableCapacity;
    const allowed = scope?.purchasableQuantity;
    const eventMax = scope?.runTime?.event?.max_to_buy;
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(capacity) ||
        !Array.isArray(allowed) || (eventMax !== null && !Number.isFinite(eventMax))) return '可選上限：讀取中';
    if (scope.busy) return '可選上限：網站處理中';
    const total = scope.$parent.totalQuantity();
    if (!Number.isFinite(total)) return '可選上限：讀取中';
    const ceiling = Math.min(capacity, eventMax > 0 ? eventMax - total + quantity : Infinity);
    const choices = allowed.filter(n => Number.isInteger(n) && n >= 0 && n <= ceiling);
    if (!choices.length) return '目前無可選張數';
    const max = Math.max(...choices);
    return `目前最多可選 ${max} 張（還可加 ${Math.max(0, max - quantity)} 張）`;
  }

  function updateLimits() {
    for (const unit of document.querySelectorAll('.ticket-unit')) {
      let label = unit.querySelector('.tikitiki-ticket-limit');
      if (!label) {
        label = document.createElement('div');
        label.className = 'tikitiki-ticket-limit';
        label.style.cssText = 'font-size:12px;color:#16824b;padding:4px 0;';
        label.title = '依網站合法張數、票種上限及整筆訂單限制計算，並非剩餘庫存。';
        unit.appendChild(label);
      }
      let text = '可選上限：讀取中';
      try {
        const scope = window.angular?.element(unit).scope();
        text = limitText(scope);
      } catch {
        // Angular may be bootstrapping or replacing this ticket's scope.
      }
      if (label.textContent !== text) label.textContent = text;
    }
  }
  updateLimits();
  setInterval(updateLimits, 300);
})();
