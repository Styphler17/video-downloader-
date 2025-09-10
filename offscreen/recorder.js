// Offscreen recorder: supports tab, window, screen
const recorders = new Map(); // key -> { mr, chunks, filename }
const MAX_CONCURRENT = 10;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.kind === 'offscreen-rec-start') {
      const { key, mode = 'tab', tabId, mimeType = 'video/webm;codecs=vp9', maxMs = 30*60*1000 } = msg;
      if (recorders.size >= MAX_CONCURRENT && !recorders.has(key)) {
        sendResponse({ error: 'Max 10 concurrent recordings reached' });
        return;
      }
      try {
        const stream = await getStream(mode, tabId);
        const mr = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        mr.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
        mr.onstop = async () => {
          try {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            chrome.runtime.sendMessage({ kind: 'recorder-finished', url });
          } finally {
            recorders.delete(key);
            chrome.runtime.sendMessage({ kind: 'recording-status', active: Array.from(recorders.keys()).map(k => parseInt(k,10)).filter(Boolean) });
          }
        };
        recorders.set(key, { mr, chunks });
        mr.start();
        setTimeout(() => { try { mr.stop(); } catch {} }, maxMs);
        chrome.runtime.sendMessage({ kind: 'recording-status', active: Array.from(recorders.keys()).map(k => parseInt(k,10)).filter(Boolean) });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: String(e && e.message || e) });
      }
    } else if (msg.kind === 'offscreen-rec-stop') {
      const { key } = msg;
      const rec = recorders.get(key);
      if (rec) { try { rec.mr.stop(); } catch {} recorders.delete(key); }
      chrome.runtime.sendMessage({ kind: 'recording-status', active: Array.from(recorders.keys()).map(k => parseInt(k,10)).filter(Boolean) });
      sendResponse({ ok: true });
    }
  })();
  return true;
});

async function getStream(mode, tabId) {
  if (mode === 'tab') {
    return await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ video: true, audio: false }, (stream) => {
        if (chrome.runtime.lastError || !stream) reject(new Error(chrome.runtime.lastError?.message || 'tabCapture failed'));
        else resolve(stream);
      });
    });
  }
  if (mode === 'window' || mode === 'screen') {
    // Prefer desktopCapture to preselect source; fallback to getDisplayMedia
    try {
      const sources = mode === 'screen' ? ['screen','window'] : ['window','screen'];
      const streamId = await new Promise((resolve, reject) => {
        chrome.desktopCapture.chooseDesktopMedia(sources, (id) => {
          if (!id) reject(new Error('User canceled'));
          else resolve(id);
        });
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
      });
      return stream;
    } catch (e) {
      // Fallback
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      return stream;
    }
  }
  // Default to tab
  return await new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ video: true, audio: false }, (stream) => {
      if (chrome.runtime.lastError || !stream) reject(new Error(chrome.runtime.lastError?.message || 'tabCapture failed'));
      else resolve(stream);
    });
  });
}

