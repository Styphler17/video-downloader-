// Inject the page-level MSE hook as early as possible
(function injectHook() {
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject/hook.js');
    s.type = 'text/javascript';
    (document.documentElement || document.head || document.body).appendChild(s);
    // Remove after load to keep DOM clean
    s.onload = () => s.remove();
  } catch (e) {
    // Best effort
  }
})();

