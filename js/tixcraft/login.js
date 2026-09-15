// Page markers only: missing markers do not prove that the session is logged out.
function getTikitikiLoginState() {
  let login = false;
  for (const link of document.querySelectorAll('nav a[href], header a[href]')) {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) continue;
    if (/^\/(?:login\/)?logout\/?$/.test(url.pathname)) return true;
    if (/^\/login\/?$/.test(url.pathname) || (url.hash === '#login' && link.closest('.account-login'))) login = true;
  }
  return login ? false : null;
}
