/* theme-init.js — loaded in <head> so the page never "flashes" white in dark mode.
   Uses the saved choice, otherwise the phone's own light/dark setting. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem('sds_theme'); } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
})();
