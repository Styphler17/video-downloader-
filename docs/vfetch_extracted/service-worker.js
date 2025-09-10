
let videoStore = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "VIDEO_FOUND") {
    const url = msg.parameter?.url;
    if (url && !videoStore.find(v => v.url === url)) {
      videoStore.push({ url });
    }
  }

  if (msg.cmd === "FETCH_VIDEOS") {
    sendResponse({ videos: videoStore });
    return true;
  }

  if (msg.cmd === "START_RECORDING") {
    chrome.scripting.executeScript({
      target: { tabId: msg.parameter.tabId },
      files: ["js/injection.js"]
    }, () => {
      chrome.tabs.sendMessage(msg.parameter.tabId, {
        cmd: "REC_START",
        parameter: { tab: msg.parameter.tabId }
      });
    });
  }
});
