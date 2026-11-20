const gamePath = location.pathname.replace(/^\/activity\/detail\//, '/activity/game/').replace(/\/$/, '');
const buyLink = [...document.links].find(link =>
  link.origin === location.origin && link.pathname.replace(/\/$/, '') === gamePath &&
  link.getAttribute('aria-disabled') !== 'true' && link.getClientRects().length);
buyLink?.click();
linkGameSessions();
