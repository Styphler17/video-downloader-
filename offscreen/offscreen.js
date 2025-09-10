// Offscreen document to run FFmpeg without service worker limits
import { filenameFromUrl } from '../utils/common.js';

async function loadFFmpeg() {
  const { createFFmpeg } = await import('../libs/ffmpeg.min.js');
  const corePath = chrome.runtime.getURL('libs/ffmpeg-core.js');
  const ffmpeg = createFFmpeg({ log: true, corePath });
  await ffmpeg.load();
  return ffmpeg;
}

function resolveUrl(base, rel) {
  try { return new URL(rel, base).href; } catch { return rel; }
}

async function fetchText(url) {
  const r = await fetch(url, { credentials: 'include', cache: 'no-cache' });
  return r.text();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function hlsToMp4(masterUrl, { quality = 'best', filename, maxSeconds = 7200, pollIntervalMs = 2000 } = {}) {
  const text = await fetchText(masterUrl);
  let playlistUrl = masterUrl;
  let pl = text;
  const variants = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const m = line.match(/#EXT-X-STREAM-INF:(.*),URI=\"(.*)\"/) || line.match(/#EXT-X-STREAM-INF:(.*)\n(.*)/);
    if (!m) continue;
    const attrs = Object.fromEntries(m[1].split(',').map(kv => kv.split('=')).map(([k,v]) => [k, String(v).replace(/\"/g,'')]));
    variants.push({ bandwidth: +attrs.BANDWIDTH || 0, uri: resolveUrl(masterUrl, m[2].trim()) });
  }
  if (variants.length > 0) {
    variants.sort((a,b)=>b.bandwidth-a.bandwidth);
    playlistUrl = (quality === 'best') ? variants[0].uri : variants.at(-1).uri;
    pl = await fetchText(playlistUrl);
  }

  // Collect segments; if playlist is live (no ENDLIST), poll until ENDLIST or maxSeconds
  const segs = [];
  const seen = new Set();
  let totalDur = 0;
  let end = false;
  let targetDur = 6;
  const parseOnce = (text) => {
    let lastDur = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        const v = +line.split(':')[1]; if (!Number.isNaN(v)) targetDur = v;
      } else if (line.startsWith('#EXTINF:')) {
        const v = +line.split(':')[1]; if (!Number.isNaN(v)) lastDur = v; else lastDur = 0;
      } else if (line && !line.startsWith('#')) {
        const uri = resolveUrl(playlistUrl, line);
        if (!seen.has(uri)) {
          seen.add(uri);
          segs.push({ uri, dur: lastDur || targetDur });
          totalDur += (lastDur || targetDur);
        }
        lastDur = 0;
      } else if (line.startsWith('#EXT-X-ENDLIST')) {
        end = true;
      }
    }
  };
  parseOnce(pl);
  const started = Date.now();
  while (!end && (totalDur < maxSeconds) && (Date.now() - started < maxSeconds * 1000 * 1.2)) {
    await sleep(pollIntervalMs);
    try { pl = await fetchText(playlistUrl); } catch { break; }
    parseOnce(pl);
  }
  
  const segUrls = segs.map(s => s.uri);
  try { chrome.runtime.sendMessage({ kind: 'hls-progress', url: masterUrl, fetched: 0, total: segUrls.length }); } catch {}
  const listName = 'list.txt';
  const entries = [];
  for (let i=0;i<segUrls.length;i++) entries.push(`file '${i}.ts'`);
  const ffmpeg = await loadFFmpeg();
  ffmpeg.FS('writeFile', listName, new TextEncoder().encode(entries.join('\n')));
  for (let i=0;i<segs.length;i++) {
    const r = await fetch(segUrls[i], { credentials: 'include', cache: 'no-cache' });
    const buf = new Uint8Array(await r.arrayBuffer());
    ffmpeg.FS('writeFile', `${i}.ts`, buf);
    try { chrome.runtime.sendMessage({ kind: 'hls-progress', url: masterUrl, fetched: i+1, total: segUrls.length }); } catch {}
  }
  await ffmpeg.run('-f','concat','-safe','0','-i', listName, '-c','copy','out.mp4');
  const data = ffmpeg.FS('readFile', 'out.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const outName = filename || filenameFromUrl(masterUrl).replace(/\.(m3u8|ts)$/i, '') + '.mp4';
  await chrome.downloads.download({ url, filename: outName });
  try { chrome.runtime.sendMessage({ kind: 'hls-complete', url: masterUrl, filename: outName }); } catch {}
  try {
    ffmpeg.FS('unlink', 'out.mp4');
    ffmpeg.FS('unlink', listName);
    for (let i=0;i<segs.length;i++) ffmpeg.FS('unlink', `${i}.ts`);
  } catch {}
  return { filename: outName };
}

async function dashToMp4(mpdUrl, { filename } = {}) {
  const ffmpeg = await loadFFmpeg();
  await ffmpeg.run('-i', mpdUrl, '-c','copy', 'out.mp4');
  const data = ffmpeg.FS('readFile', 'out.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const outName = filename || filenameFromUrl(mpdUrl).replace(/\.(mpd)$/i, '') + '.mp4';
  await chrome.downloads.download({ url, filename: outName });
  try { ffmpeg.FS('unlink','out.mp4'); } catch {}
  return { filename: outName };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.kind === 'offscreen-hls') {
      const result = await hlsToMp4(msg.url, msg.options || {});
      sendResponse(result);
    } else if (msg.kind === 'offscreen-dash') {
      const result = await dashToMp4(msg.url, msg.options || {});
      sendResponse(result);
    }
  })();
  return true;
});
