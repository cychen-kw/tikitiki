// link each session name in #gameList to its ticket purchase page
// area page format: https://tixcraft.com/ticket/area/{activityId}/{sessionId}
function linkGameSessions() {
  let activityId = location.pathname.split("/").pop();

  function apply() {
    let linked = 0;
    $("#gameList tbody tr").each(function() {
      let $nameCell = $(this).find("td").eq(1);
      if ($nameCell.find("a").length) {
        linked++;
        return;
      }

      let link = $(this).find("button[data-href]").attr("data-href");
      if (!link) {
        let sessionId = $(this).attr("data-key");
        if (sessionId) {
          link = "https://tixcraft.com/ticket/area/" + activityId + "/" + sessionId;
        }
      }
      if (link) {
        $nameCell.wrapInner($("<a>").attr("href", link));
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
}
