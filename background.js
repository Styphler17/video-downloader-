import { isVideoLikeUrl, isHls, isDash, filenameFromUrl, sleep } from './utils/common.js';

const mediaLists = new Map(); // tabId -> items

function updateBadgeCount(tabId) {
  const items = mediaLists.get(tabId) || [];
  chrome.action.setBadgeText({ text: items.length > 0 ? items.length.toString() : '', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
}

// Helper functions
function resolveUrl(base, rel) {
  try {
    return new URL(rel, base).href;
  } catch {
    return rel;
  }
}

async function fetchText(url) {
  const r = await fetch(url);
  return r.text();
}

async function loadFFmpeg() {
  const { createFFmpeg } = await import('./libs/ffmpeg.min.js');
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  return ffmpeg;
}

async function hlsToMp4(masterUrl, { quality = 'best' } = {}) {
  const text = await fetchText(masterUrl);
  const variants = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const m = line.match(/#EXT-X-STREAM-INF:(.*),URI="(.*)"/) || line.match(/#EXT-X-STREAM-INF:(.*)\n(.*)/);
    if (!m) continue;
    const attrs = Object.fromEntries(m[1].split(',').map(kv => kv.split('=')).map(([k,v]) => [k, String(v).replace(/"/g,'')]));
    variants.push({ bandwidth: +attrs.BANDWIDTH || 0, uri: resolveUrl(masterUrl, m[2].trim()) });
  }
  variants.sort((a,b)=>b.bandwidth-a.bandwidth);
  const playlistUrl = (quality === 'best') ? variants[0].uri : variants.at(-1).uri;
  const pl = await fetchText(playlistUrl);
  const segs = [];
  let base = playlistUrl;
  for (const line of pl.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    segs.push(resolveUrl(base, line.trim()));
  }
  // Write a text file listing segments for ffmpeg concat demuxer
  const listName = 'list.txt';
  const entries = [];
  for (let i=0;i<segs.length;i++) entries.push(`file '${i}.ts'`);
  const ffmpeg = await loadFFmpeg();
  ffmpeg.FS('writeFile', listName, new TextEncoder().encode(entries.join('\n')));
  // Download segments sequentially (keeps memory lower)
  for (let i=0;i<segs.length;i++) {
    const r = await fetch(segs[i], { credentials: 'include' });
    const buf = new Uint8Array(await r.arrayBuffer());
    ffmpeg.FS('writeFile', `${i}.ts`, buf);
  }
  // Remux to MP4 (stream copy when possible)
  await ffmpeg.run('-f','concat','-safe','0','-i', listName, '-c','copy','out.mp4');
  const data = ffmpeg.FS('readFile', 'out.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const filename = filenameFromUrl(masterUrl);
  await chrome.downloads.download({ url, filename });
  // Cleanup FS (best-effort)
  try {
    ffmpeg.FS('unlink', 'out.mp4');
    ffmpeg.FS('unlink', listName);
    for (let i=0;i<segs.length;i++) ffmpeg.FS('unlink', `${i}.ts`);
  } catch {}
  return { filename };
}

// Minimal DASH: rely on ffmpeg to fetch and mux via network input
async function dashToMp4(mpdUrl, { filename = 'video.mp4' } = {}) {
  const ffmpeg = await loadFFmpeg();
  await ffmpeg.run('-i', mpdUrl, '-c','copy', 'out.mp4');
  const data = ffmpeg.FS('readFile', 'out.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename });
  try { ffmpeg.FS('unlink','out.mp4'); } catch {}
  return { filename };
}

// Event listeners
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.kind === 'get-media-list') {
    const items = mediaLists.get(msg.tabId) || [];
    sendResponse({ items });
  } else if (msg.kind === 'download-hls') {
    const result = await hlsToMp4(msg.url, msg.options);
    sendResponse(result);
  } else if (msg.kind === 'download-dash') {
    const result = await dashToMp4(msg.url, msg.options);
    sendResponse(result);
  } else if (msg.kind === 'download-direct') {
    await chrome.downloads.download({ url: msg.url, filename: msg.filename });
    sendResponse({ filename: msg.filename });
  } else if (msg.kind === 'dom-video-candidates') {
    // Store media items for the tab
    mediaLists.set(sender.tab.id, msg.items);
    updateBadgeCount(sender.tab.id);
    sendResponse();
  } else if (msg.kind === 'record-start') {
    chrome.tabs.get(msg.tabId, (tab) => {
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.warn('Cannot record chrome:// or chrome-extension:// URLs');
        sendResponse({ error: 'Cannot record chrome:// or chrome-extension:// URLs' });
      } else {
        chrome.scripting.executeScript({
          target: { tabId: msg.tabId },
          files: ['recorder/tab-recorder.js']
        });
        sendResponse();
      }
    });
} else if (msg.kind === 'recorder-finished') {
  // Store recording in history instead of auto downloading
  const recordings = (await chrome.storage.local.get(['recordings'])).recordings || [];
  recordings.push({ url: msg.url, timestamp: Date.now(), filename: `recording-${Date.now()}.webm` });
  await chrome.storage.local.set({ recordings });
  sendResponse();
}
  return true;
});

// Clear badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  mediaLists.delete(tabId);
});
