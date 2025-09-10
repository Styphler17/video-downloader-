// Offscreen recorder: supports tab, window, screen
const recorders = new Map(); // key -> { mr, chunks, filename }
const MAX_CONCURRENT = 10;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.kind === 'offscreen-rec-start') {
      const { key, mode = 'tab', tabId, mimeType = 'video/webm;codecs=vp9', maxMs = 30*60*1000, tabAudio = false, mic = false } = msg;
      if (recorders.size >= MAX_CONCURRENT && !recorders.has(key)) {
        sendResponse({ error: 'Max 10 concurrent recordings reached' });
        return;
      }
      try {
        let stream = await getStream({ mode, tabId, tabAudio, mic });
        stream = await mixAudioIfNeeded(stream, { mic });
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

async function getStream({ mode, tabId, tabAudio, mic }) {
  if (mode === 'tab') {
    return await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ video: true, audio: !!tabAudio }, (stream) => {
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
      const constraints = {
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } },
        audio: mic ? true : false
      };
      // Attempt to capture system audio if possible
      if (!mic) {
        try {
          constraints.audio = { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } };
        } catch {}
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (e) {
      // Fallback
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: mic || tabAudio || false });
      return stream;
    }
  }
  // Default to tab
  return await new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ video: true, audio: !!tabAudio }, (stream) => {
      if (chrome.runtime.lastError || !stream) reject(new Error(chrome.runtime.lastError?.message || 'tabCapture failed'));
      else resolve(stream);
    });
  });
}

// Optional mix: combine mic with capture audio into single track
async function mixAudioIfNeeded(baseStream, { mic }) {
  if (!mic) return baseStream;
  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ctx.createMediaStreamDestination();
    const sources = [];
    const baseAudio = baseStream.getAudioTracks().length ? ctx.createMediaStreamSource(baseStream) : null;
    const micSource = ctx.createMediaStreamSource(micStream);
    if (baseAudio) { sources.push(baseAudio); }
    sources.push(micSource);
    for (const s of sources) s.connect(dest);
    const out = new MediaStream();
    baseStream.getVideoTracks().forEach(t => out.addTrack(t));
    if (dest.stream.getAudioTracks()[0]) out.addTrack(dest.stream.getAudioTracks()[0]);
    return out;
  } catch {
    return baseStream;
  }
}
