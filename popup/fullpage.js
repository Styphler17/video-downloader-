import { filenameFromUrl } from "../utils/common.js";

const recordingsTabBtn = document.getElementById("recordingsTab");
const videosTabBtn = document.getElementById("videosTab");
const listEl = document.getElementById("list");
const tpl = document.getElementById("item-tpl");
const recordingTpl = document.getElementById("recording-tpl");
const tabTpl = document.getElementById("tab-tpl");

let currentTab = "videos";
let tabId = null;

const placeholderSvg = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSIzMiIgeT0iMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSIgZmlsbD0iIzk5OSIgc3R5bGU9ImZvbnQtc2l6ZToxMHB4O2ZvbnQtZmFtaWx5OnN5c3RlbS11aSxzYW5zLXNlcmlmOyI+Tm8gVGh1bWI8L3RleHQ+PC9zdmc+";

init();

async function init() {
  applyTheme();
  document.getElementById("themeToggle").onclick = toggleTheme;
  recordingsTabBtn.onclick = () => switchTab("recordings");
  videosTabBtn.onclick = () => switchTab("videos");

  const urlParams = new URLSearchParams(window.location.search);
  tabId = parseInt(urlParams.get("tabId"));

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.kind === 'media-list-updated' && msg.tabId === tabId) {
      scheduleRender();
    }
  });

  await render();
}

async function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  recordingsTabBtn.classList.toggle("active", tab === "recordings");
  videosTabBtn.classList.toggle("active", tab === "videos");
  await render();
}

async function render() {
  listEl.innerHTML = "";
  if (currentTab === "videos") {
    const res = await chrome.runtime.sendMessage({
      kind: "get-media-list",
      tabId: tabId,
    });
    const tipEl = document.getElementById("tip");
    for (const item of res.items || []) {
      if (item.type === 'mse') continue;
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.querySelector(".type").textContent = item.type;
      li.querySelector(".name").textContent = item.type === 'mse' ? 'MSE stream detected (use Record Tab)' : filenameFromUrl(item.url);

      const modeSel = li.querySelector(".mode");
      const dlBtn = li.querySelector(".dl");
      const playBtn = li.querySelector(".play");
      const preview = li.querySelector('.preview');
      const pv = li.querySelector('.preview-video');
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
        modeSel.style.display = 'none';
        dlBtn.textContent = 'Record Tab';
        dlBtn.onclick = async () => {
          await chrome.runtime.sendMessage({ kind: 'record-start', tabId });
        };
        if (playBtn) { playBtn.textContent = 'Open'; playBtn.onclick = () => chrome.tabs.create({ url: item.url }); }
      } else {
        if (playBtn) {
          if (isHls) playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'hls' });
          else if (isDash) playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'dash' });
          else playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'file' });
        }
        dlBtn.onclick = async () => {
          const mode = modeSel.value === "auto" ? item.type : modeSel.value;
          if (mode === "file") {
            await chrome.runtime.sendMessage({
              kind: "download-direct",
              url: item.url,
              filename: filenameFromUrl(item.url),
            });
          } else if (mode === "hls") {
            await chrome.runtime.sendMessage({
              kind: "download-hls",
              url: item.url,
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

      // Generate thumbnail
      // Thumbnails disabled per request

      listEl.appendChild(li);
    }
    // context menu actions (open/copy/download)
    listEl.querySelectorAll('.item').forEach((liEl, idx) => {
      const item = (res.items || [])[idx];
      if (!item) return;
      const ctxOpen = liEl.querySelector('.ctx-open');
      const ctxCopy = liEl.querySelector('.ctx-copy');
      const ctxDownload = liEl.querySelector('.ctx-download');
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
        };
      }
      if (ctxDownload) { ctxDownload.onclick = () => liEl.querySelector('.dl').click(); }
    });
    // Tip logic
    const items = res.items || [];
    const downloadable = items.some((i) => i.type === "file" || i.type === "hls" || i.type === "dash");
    const msePresent = items.some((i) => i.type === "mse");
    if (tipEl) {
      if (!downloadable && msePresent) {
        tipEl.textContent = 'Streaming detected (MSE). Use "Record Tab" to capture.';
        tipEl.style.display = '';
      } else if (items.length === 0) {
        tipEl.textContent = 'No media found yet. Play a video to detect streams.';
        tipEl.style.display = '';
      } else {
        tipEl.style.display = 'none';
      }
    }
  } else if (currentTab === "recordings") {
    // 1) Live list of tabs with preview and record controls
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const tabEls = new Map();
    for (const t of tabs) {
      if (!t.id || !t.title) continue;
      const li = tabTpl.content.firstElementChild.cloneNode(true);
      li.dataset.tabId = String(t.id);
      li.querySelector('.name').textContent = t.title || t.url || `Tab ${t.id}`;
      li.querySelector('.timestamp').textContent = `${t.active ? 'Active' : 'Inactive'} • Window ${t.windowId}`;
      const img = li.querySelector('.thumbnail');
      img.src = '';
      const switchBtn = li.querySelector('.switch');
      const recBtn = li.querySelector('.rec');
      switchBtn.onclick = async () => {
        await chrome.windows.update(t.windowId, { focused: true });
        await chrome.tabs.update(t.id, { active: true });
      };
      recBtn.onclick = async () => {
        await chrome.runtime.sendMessage({ kind: 'record-start', tabId: t.id, options: {} });
      };
      listEl.appendChild(li);
      tabEls.set(t.id, { li, img, tab: t });
    }

    // 2) Update previews for active tabs per window
    const updatePreviews = async () => {
      try {
        const winIds = new Set(tabs.map(t => t.windowId));
        for (const wId of winIds) {
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(wId, { format: 'jpeg', quality: 60 });
            // Find active tab in this window
            const t = tabs.find(tt => tt.windowId === wId && tt.active);
            if (!t) continue;
            const el = tabEls.get(t.id);
            if (el) el.img.src = dataUrl;
          } catch {}
        }
      } catch {}
    };
    updatePreviews();
    if (window.__prevTimer) clearInterval(window.__prevTimer);
    window.__prevTimer = setInterval(updatePreviews, 2000);

    // 3) Historical recordings below
    const storage = await chrome.storage.local.get("recordings");
    const recordings = storage.recordings || [];
    for (const rec of recordings) {
      const li = recordingTpl.content.firstElementChild.cloneNode(true);
      li.querySelector(".name").textContent = rec.filename;
      li.querySelector(".timestamp").textContent = new Date(rec.timestamp).toLocaleString();
      const dlBtn = li.querySelector(".dl");
      dlBtn.onclick = async () => { await chrome.downloads.download({ url: rec.url, filename: rec.filename }); };
      listEl.appendChild(li);
    }
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
      const onError = () => { cleanup(); reject(new Error('video error')); };
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
      setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 4000);
    } catch (e) {
      reject(e);
    }
  });
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

function shouldGenerateThumbs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['genThumbs'], (st) => {
      resolve(st.genThumbs !== false);
    });
  });
}

// Inline preview helpers (HLS/DASH/file)
const __inlinePlayers = new WeakMap();
let shakaInited = false;
function toggleInlinePreview(videoEl, containerEl, { url, kind }) {
  if (!videoEl || !containerEl) return;
  const isOpen = containerEl.style.display !== 'none';
  if (isOpen) { return destroyInline(videoEl, containerEl); }
  containerEl.style.display = '';
  destroyInline(videoEl, containerEl);
  if (kind === 'hls' && window.Hls && window.Hls.isSupported()) {
    const h = new window.Hls({ maxBufferLength: 30 });
    h.loadSource(url);
    h.attachMedia(videoEl);
    __inlinePlayers.set(videoEl, { kind, hls: h });
  } else if (kind === 'hls' && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    __inlinePlayers.set(videoEl, { kind });
  } else if (kind === 'dash' && window.shaka) {
    if (!shakaInited) { window.shaka.polyfill.installAll(); shakaInited = true; }
    try {
      const p = new window.shaka.Player(videoEl);
      p.load(url).catch(() => { chrome.tabs.create({ url }); });
      __inlinePlayers.set(videoEl, { kind, shaka: p });
    } catch { chrome.tabs.create({ url }); }
  } else {
    videoEl.src = url;
    __inlinePlayers.set(videoEl, { kind });
  }
}

function destroyInline(videoEl, containerEl) {
  const st = __inlinePlayers.get(videoEl);
  if (st) {
    try { if (st.hls) st.hls.destroy(); } catch {}
    try { if (st.shaka) st.shaka.destroy(); } catch {}
  }
  try { videoEl.pause(); } catch {}
  videoEl.removeAttribute('src');
  videoEl.load();
  containerEl.style.display = 'none';
  __inlinePlayers.delete(videoEl);
}
