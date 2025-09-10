
let tabId = null;
try {
  tabId = localStorage.getItem("vfetch_recorder_tab");
} catch {}

if (tabId) {
  tabId = parseInt(tabId);
  const channel = new BroadcastChannel(`vfetch-channel-${tabId}`);
  const hookScript = document.createElement("script");
  hookScript.src = chrome.runtime.getURL("js/hook.js");
  document.documentElement.appendChild(hookScript);

  const overlay = document.createElement("div");
  overlay.style = "position:fixed;bottom:10px;right:10px;z-index:9999999;";
  overlay.innerHTML = '<img src="' + chrome.runtime.getURL("img/recording.svg") + '" width="100" height="100">';
  document.body.appendChild(overlay);

  window.addEventListener("beforeunload", () => {
    channel.postMessage({ cmd: "REC_STOP" });
    channel.close();
    localStorage.removeItem("vfetch_recorder_tab");
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "REC_START") {
    localStorage.setItem("vfetch_recorder_tab", msg.parameter.tab);
    setTimeout(() => {
      location.reload();
    }, 300);
  }
});
