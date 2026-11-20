// link each session name in #gameList to its ticket purchase page
// area page format: /ticket/area/{activityId}/{sessionId}
function linkGameSessions() {
  let activityId = location.pathname.split("/").pop();

  function linkCell(cell, url) {
    const link = document.createElement('a');
    link.href = url;
    link.style.color = '#1a56b0';
    link.style.textDecoration = 'underline';
    while (cell.firstChild) link.appendChild(cell.firstChild);
    cell.appendChild(link);
    return link;
  }

  function apply() {
    document.querySelectorAll("#gameList tbody tr").forEach(tr => {
      const [, nameCell, venueCell] = tr.querySelectorAll('td');
      const venue = venueCell?.textContent.trim();
      if (venue && !venueCell.querySelector('a')) {
        const mapLink = linkCell(venueCell, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue));
        mapLink.target = '_blank';
        mapLink.rel = 'noopener noreferrer';
      }
      if (!nameCell) return;
      if (nameCell.querySelector("a")) return;

      let button = tr.querySelector("button[data-href]");
      let link = button ? button.getAttribute("data-href") : null;
      if (!link) {
        let sessionId = tr.getAttribute("data-key");
        if (sessionId) {
          link = "/ticket/area/" + activityId + "/" + sessionId;
        }
      }
      if (link) linkCell(nameCell, link);
    });
  }

  apply();

  // Buy Tickets can replace the table repeatedly, even long after page load.
  // Watch its parent tree, but ignore unrelated updates such as the widget clock.
  const observer = new MutationObserver(records => {
    if (records.some(record => record.target.closest?.('#gameList') ||
      [...record.addedNodes].some(node => node.nodeType === 1 &&
        (node.matches('#gameList') || node.querySelector('#gameList'))))) apply();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
