// link each session name in #gameList to its ticket purchase page
// area page format: /ticket/area/{activityId}/{sessionId}
function linkGameSessions() {
  let activityId = location.pathname.split("/").pop();

  function apply() {
    document.querySelectorAll("#gameList tbody tr").forEach(tr => {
      let nameCell = tr.querySelectorAll("td")[1];
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
      if (link) {
        let a = document.createElement("a");
        a.href = link;
        while (nameCell.firstChild) a.appendChild(nameCell.firstChild);
        nameCell.appendChild(a);
      }
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
