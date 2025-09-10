
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "OFFSCREEN_FETCH_DATA") {
    const { url, headers, method } = msg.parameter;
    fetch(url, {
      method,
      headers,
      mode: "cors",
      credentials: "include"
    })
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.blob();
    })
    .then(blob => {
      const blobURL = URL.createObjectURL(blob);
      sendResponse({ ok: true, blobURL });
    })
    .catch(err => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
});
