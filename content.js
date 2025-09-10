function collectVideoSources() {
  const items = [];
  document.querySelectorAll("video").forEach((v) => {
    const srcs = new Set();
    if (v.currentSrc) srcs.add(v.currentSrc);
    if (v.src) srcs.add(v.src);
    v.querySelectorAll("source").forEach((s) => s.src && srcs.add(s.src));
    for (const u of srcs)
      items.push({
        id: `dom:${u}`,
        url: u,
        type: "file",
        contentType: "video",
      });
    // Add listeners if not already
    if (!v.__videoListenerAdded) {
      v.addEventListener('play', collectVideoSources);
      v.addEventListener('loadstart', collectVideoSources);
      v.addEventListener('mouseenter', collectVideoSources, { passive: true });
      v.__videoListenerAdded = true;
    }
  });
  try {
    chrome.runtime.sendMessage({ kind: "dom-video-candidates", items }).catch(() => {});
  } catch (e) {
    // Extension context invalidated, ignore
  }
}

collectVideoSources();
const obs = new MutationObserver(() => collectVideoSources());
obs.observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['src', 'currentSrc'], // to detect src changes
});

// Also collect periodically in case of dynamic loading
setInterval(collectVideoSources, 5000);

// Recorder control
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.kind === "recorder-start") {
    startRecorder(msg.options || {});
  } else if (msg.kind === 'recorder-stop') {
    try { if (window.__recorder && window.__recorder.state !== 'inactive') window.__recorder.stop(); } catch {}
  }
});

// Trigger a quick rescan when hovering over videos (for hover-plays)
let __hoverScanTimer = null;
document.addEventListener('mouseover', (e) => {
  try {
    const el = e.target;
    if (!el) return;
    const v = el.tagName === 'VIDEO' ? el : (el.closest ? el.closest('video') : null);
    if (!v) return;
    if (__hoverScanTimer) return;
    __hoverScanTimer = setTimeout(() => { __hoverScanTimer = null; collectVideoSources(); }, 200);
  } catch {}
}, true);

// Listen for page-level MSE hook signals and forward to background
window.addEventListener('message', (e) => {
  try {
    const d = e.data;
    if (!d || !d.__uvd) return;
    if (d.kind === 'mse-detected' || d.kind === 'mse-append') {
      chrome.runtime.sendMessage({ kind: 'mse-detected', mime: d.mime || '' }).catch(() => {});
    }
  } catch {}
}, false);

async function startRecorder({
  mimeType = "video/webm;codecs=vp9",
  maxMs = 30 * 60 * 1000,
}) {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
    });
    const rec = new MediaRecorder(stream, { mimeType });
    window.__recorder = rec;
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      try {
        chrome.runtime.sendMessage({ kind: "recorder-finished", url }).catch(() => {});
      } catch (e) {
        // Extension context invalidated, ignore
      }
    };
    rec.start();
    setTimeout(() => rec.stop(), maxMs);
  } catch (e) {
    console.warn("Recorder error", e);
  }
}
