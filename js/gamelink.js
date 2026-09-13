// link each session name in #gameList to its ticket purchase page
// area page format: https://tixcraft.com/ticket/area/{activityId}/{sessionId}
function linkGameSessions() {
  let activityId = location.pathname.split("/").pop();

  function apply() {
    let linked = 0;
    document.querySelectorAll("#gameList tbody tr").forEach(tr => {
      let nameCell = tr.querySelectorAll("td")[1];
      if (!nameCell) return;
      if (nameCell.querySelector("a")) {
        linked++;
        return;
      }

      let button = tr.querySelector("button[data-href]");
      let link = button ? button.getAttribute("data-href") : null;
      if (!link) {
        let sessionId = tr.getAttribute("data-key");
        if (sessionId) {
          link = "https://tixcraft.com/ticket/area/" + activityId + "/" + sessionId;
        }
      }
      if (link) {
        let a = document.createElement("a");
        a.href = link;
        while (nameCell.firstChild) a.appendChild(nameCell.firstChild);
        nameCell.appendChild(a);
        linked++;
      }
    });
    return linked;
  }

  if (apply() > 0) return;

  // detail page loads #gameListContainer's table via ajax after document_end,
  // so keep watching until the rows actually show up
  let observer = new MutationObserver(() => {
    if (apply() > 0) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // give up after 30s in case this page never gets a #gameList (no ajax fired)
  setTimeout(() => observer.disconnect(), 30000);
}
