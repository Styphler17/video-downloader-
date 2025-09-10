import { filenameFromUrl } from "../utils/common.js";

const listEl = document.getElementById("list");
const tpl = document.getElementById("item-tpl");

init();

async function init() {
  applyTheme();
  document.getElementById("themeToggle").onclick = toggleTheme;
  document.getElementById("refresh").onclick = render;
  document.getElementById("record").onclick = startRecord;
  document.getElementById("screenshot").onclick = screenshot;
  document.getElementById("fullPageBtn").onclick = openFullPage;
  const tab = await getActiveTab();
  window.__activeTabId = tab?.id;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.kind === 'media-list-updated' && msg.tabId === window.__activeTabId) {
      scheduleRender();
    }
  });
  await render();
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
      resolve(tabs[0])
    );
  });
}

async function render() {
  const tab = await getActiveTab();
  window.__activeTabId = tab?.id;
  const res = await chrome.runtime.sendMessage({
    kind: "get-media-list",
    tabId: tab.id,
  });
  const tipEl = document.getElementById("tip");
  listEl.innerHTML = "";
  const items = res.items || [];
  const downloadable = items.some((i) => i.type === "file" || i.type === "hls" || i.type === "dash");
  const msePresent = items.some((i) => i.type === "mse");
  if (tipEl) {
    if (!downloadable && msePresent) {
      tipEl.innerHTML = 'Streaming detected (MSE). <button id="tipRecord">Record Tab</button>';
      tipEl.style.display = '';
      const tipBtn = document.getElementById('tipRecord');
      if (tipBtn) tipBtn.onclick = startRecord;
    } else if (items.length === 0) {
      tipEl.textContent = 'No media found yet. Play a video to detect streams.';
      tipEl.style.display = '';
    } else {
      tipEl.style.display = 'none';
    }
  }
  for (const item of items) {
    if (item.type === 'mse') {
      // Keep for tip, but do not render as a list entry
      continue;
    }
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.querySelector(".type").textContent = item.type;
    li.querySelector(".name").textContent = item.type === 'mse' ? 'MSE stream detected (use Record Tab)' : filenameFromUrl(item.url);

    const modeSel = li.querySelector(".mode");
    const dlBtn = li.querySelector(".dl");
    const playBtn = li.querySelector(".play");
    const moreBtn = li.querySelector('.more');
    const menu = li.querySelector('.ctx-menu');
    const menuOpen = () => menu && (menu.style.display = 'flex');
    const menuClose = () => menu && (menu.style.display = 'none');
    if (moreBtn && menu) {
      moreBtn.onclick = (e) => { e.stopPropagation();
        const visible = menu.style.display !== 'none' && menu.style.display !== '' ? true : (menu.offsetParent !== null);
        closeAllMenus();
        if (!visible) menuOpen();
      };
    }
    const isHls = item.type === 'hls' || /\.m3u8(\?|#|$)/i.test(item.url || '');
    const isDash = item.type === 'dash' || /\.mpd(\?|#|$)/i.test(item.url || '');
    if (item.type === 'mse') {
      // Suggest recording for MSE streams
      modeSel.style.display = 'none';
      dlBtn.textContent = 'Record Tab';
      dlBtn.onclick = startRecord;
      if (playBtn) { playBtn.textContent = 'Open'; playBtn.onclick = () => chrome.tabs.create({ url: item.url }); }
    } else if (isHls) {
      if (playBtn) playBtn.onclick = () => showPreview(item.url, 'hls');
    } else if (isDash) {
      if (playBtn) playBtn.onclick = () => showPreview(item.url, 'dash');
    } else {
      if (playBtn) playBtn.onclick = () => showPreview(item.url, 'file');
      dlBtn.onclick = async () => {
        const mode = modeSel.value === "auto" ? item.type : modeSel.value;
        if (mode === "file") {
          await chrome.runtime.sendMessage({
            kind: "download-direct",
            url: item.url,
            filename: filenameFromUrl(item.url),
          });
        } else if (mode === "hls") {
        const st = await chrome.storage.sync.get(['hlsQuality']);
        await chrome.runtime.sendMessage({
          kind: "download-hls",
          url: item.url,
          options: { quality: st.hlsQuality || 'best' },
          filename:
            filenameFromUrl(item.url).replace(/\.(m3u8|ts)$/i, "") + ".mp4",
        });
        } else if (mode === "dash") {
          await chrome.runtime.sendMessage({
            kind: "download-dash",
            url: item.url,
            filename: filenameFromUrl(item.url).replace(/\.(mpd)$/i, "") + ".mp4",
          });
        }
      };
    }

    // Context menu actions
    const ctxOpen = li.querySelector('.ctx-open');
    const ctxCopy = li.querySelector('.ctx-copy');
    const ctxDownload = li.querySelector('.ctx-download');
    if (ctxOpen) {
      if (item.type === 'mse') ctxOpen.style.display = 'none';
      else ctxOpen.onclick = () => chrome.tabs.create({ url: item.url });
    }
    if (ctxCopy) {
      if (item.type === 'mse') ctxCopy.style.display = 'none';
      else ctxCopy.onclick = async () => {
        try { await navigator.clipboard.writeText(item.url); } catch {
          const ta = document.createElement('textarea'); ta.value = item.url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        menuClose();
      };
    }
    if (ctxDownload) {
      ctxDownload.onclick = () => dlBtn.click();
    }

    // Generate thumbnail
    const imgEl = li.querySelector(".thumbnail");
    const enableThumbs = await shouldGenerateThumbs();
    if (enableThumbs && item.type === 'file') {
      generateThumbnail(item.url)
        .then((thumbSrc) => { imgEl.src = thumbSrc; })
        .catch(() => { imgEl.src = placeholderSvg; });
    } else {
      imgEl.src = placeholderSvg;
    }

    listEl.appendChild(li);
  }
}

let __renderTimer = null;
function scheduleRender() {
  if (__renderTimer) return;
  __renderTimer = setTimeout(async () => {
    __renderTimer = null;
    try { await render(); } catch {}
  }, 150);
}

function closeAllMenus() {
  document.querySelectorAll('.ctx-menu').forEach(m => (m.style.display = 'none'));
}
document.addEventListener('click', () => closeAllMenus());

const placeholderSvg = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSIzMiIgeT0iMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSIgZmlsbD0iIzk5OSIgc3R5bGU9ImZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnN5c3RlbS11aSxzYW5zLXNlcmlmOyI+Tm8gVGh1bWI8L3RleHQ+PC9zdmc+";

async function generateThumbnail(videoUrl) {
  return new Promise((resolve, reject) => {
    try {
      if (videoUrl.startsWith('chrome://') || videoUrl.startsWith('chrome-extension://')) {
        reject(new Error('Disallowed URL scheme'));
        return;
      }
      if (/\.(m3u8|mpd)(\?|#|$)/i.test(videoUrl)) {
        reject(new Error('Stream manifest, skip'));
        return;
      }
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      const onError = (e) => { cleanup(); reject(new Error('video error')); };
      const onSeeked = () => {
        try {
          if (video.videoWidth === 0) throw new Error('no dimensions');
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = Math.max(1, Math.round((64 / video.videoWidth) * video.videoHeight));
          const ctx = canvas.getContext('2d');
          try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { throw new Error('draw failed'); }
          let dataUrl;
          try { dataUrl = canvas.toDataURL('image/jpeg'); } catch { throw new Error('tainted'); }
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };
      const onLoadedMeta = () => {
        const target = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
        // Seek after metadata to ensure dimensions available
        video.currentTime = target;
      };
      const cleanup = () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('loadedmetadata', onLoadedMeta);
        try { video.src = ''; } catch {}
      };
      video.addEventListener('error', onError);
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('loadedmetadata', onLoadedMeta, { once: true });
      video.src = videoUrl;
      // Timeout fallback
      setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 4000);
    } catch (e) {
      reject(e);
    }
  });
}

let currentHls = null;
let currentShaka = null;
let shakaInited = false;
function showPreview(url, kind = 'file') {
  const modal = document.getElementById('previewModal');
  const video = document.getElementById('previewVideo');
  const closeBtn = document.getElementById('closePreview');
  if (!modal || !video) return;
  try { if (currentHls) { currentHls.destroy(); currentHls = null; } } catch {}
  try { if (currentShaka) { currentShaka.destroy(); currentShaka = null; } } catch {}
  if (kind === 'hls' && window.Hls && window.Hls.isSupported()) {
    currentHls = new window.Hls({ maxBufferLength: 30 });
    currentHls.loadSource(url);
    currentHls.attachMedia(video);
  } else if (kind === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
  } else if (kind === 'dash' && window.shaka) {
    try {
      if (!shakaInited) { window.shaka.polyfill.installAll(); shakaInited = true; }
      currentShaka = new window.shaka.Player(video);
      currentShaka.load(url).catch(() => { window.open(url, '_blank'); });
    } catch {
      window.open(url, '_blank');
    }
  } else {
    video.src = url;
  }
  modal.style.display = '';
  closeBtn.onclick = hidePreview;
  modal.onclick = (e) => { if (e.target === modal) hidePreview(); };
}

function hidePreview() {
  const modal = document.getElementById('previewModal');
  const video = document.getElementById('previewVideo');
  if (!modal || !video) return;
  try { if (currentHls) { currentHls.destroy(); currentHls = null; } } catch {}
  try { if (currentShaka) { currentShaka.destroy(); currentShaka = null; } } catch {}
  try { video.pause(); } catch {}
  video.removeAttribute('src');
  video.load();
  modal.style.display = 'none';
}

function shouldGenerateThumbs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['genThumbs'], (st) => {
      resolve(st.genThumbs !== false);
    });
  });
}

async function startRecord() {
  const tab = await getActiveTab();
  const response = await chrome.runtime.sendMessage({
    kind: "record-start",
    tabId: tab.id,
    options: {},
  });
  if (response && response.error) {
    alert(response.error);
  }
}

async function screenshot() {
  const tab = await getActiveTab();
  const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
    format: "png",
  });
  const fname = `frame-${Date.now()}.png`;
  await chrome.downloads.download({ url: dataUrl, filename: fname });
}

function applyTheme() {
  chrome.storage.sync.get(["theme"], ({ theme }) => {
    document.documentElement.classList.toggle("light", theme === "light");
  });
}
function toggleTheme() {
  const light = !document.documentElement.classList.contains("light");
  document.documentElement.classList.toggle("light", light);
  chrome.storage.sync.set({ theme: light ? "light" : "dark" });
}

async function openFullPage() {
  const tab = await getActiveTab();
  chrome.tabs.create({
    url: chrome.runtime.getURL(`popup/fullpage.html?tabId=${tab.id}`),
  });
}
