import { filenameFromUrl } from "../utils/common.js";

const listEl = document.getElementById("list");
const tpl = document.getElementById("item-tpl");

init();

async function init() {
  applyTheme();
  document.getElementById("themeToggle").onclick = toggleTheme;
  document.getElementById("refresh").onclick = render;
  document.getElementById("record").onclick = openTabPicker;
  document.getElementById("screenshot").onclick = screenshot;
  document.getElementById("fullPageBtn").onclick = openFullPage;
  const tab = await getActiveTab();
  window.__activeTabId = tab?.id;
  setupRecPanel();
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.kind === 'media-list-updated' && msg.tabId === window.__activeTabId) {
      scheduleRender();
    }
    if (msg && msg.kind === 'hls-progress') {
      const stEl = document.getElementById('status');
      if (!stEl) return;
      const show = () => { stEl.style.display = ''; };
      if (window.__activeDownloadUrl && msg.url && msg.url.startsWith(window.__activeDownloadUrl)) {
        show();
        const pct = msg.total ? Math.floor((msg.fetched / msg.total) * 100) : 0;
        stEl.textContent = `HLS downloading: ${msg.fetched}/${msg.total} (${pct}%)`;
      }
    }
    if (msg && msg.kind === 'hls-complete') {
      const stEl = document.getElementById('status');
      if (stEl) { stEl.textContent = 'HLS download complete'; setTimeout(() => { stEl.style.display = 'none'; }, 1500); }
      window.__activeDownloadUrl = null;
    }
    if (msg && msg.kind === 'recording-status') {
      updateRecPanel(msg.active || []);
      // update tab picker badges if open
      if (document.getElementById('tabPicker')?.style.display !== 'none') renderTabPicker();
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
  // update recording state
  try {
    const rec = await chrome.runtime.sendMessage({ kind: 'get-recording-status' });
    updateRecPanel((rec && rec.active) || []);
  } catch {}
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
      // Suggest recording for MSE streams
      modeSel.style.display = 'none';
      dlBtn.textContent = 'Record Tab';
      dlBtn.onclick = startRecord;
      if (playBtn) { playBtn.textContent = 'Open'; playBtn.onclick = () => chrome.tabs.create({ url: item.url }); }
    } else if (isHls) {
      if (playBtn) playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'hls' });
    } else if (isDash) {
      if (playBtn) playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'dash' });
    } else {
      if (playBtn) playBtn.onclick = () => toggleInlinePreview(pv, preview, { url: item.url, kind: 'file' });
      dlBtn.onclick = async () => {
        const mode = modeSel.value === "auto" ? item.type : modeSel.value;
        if (mode === "file") {
          await chrome.runtime.sendMessage({
            kind: "download-direct",
            url: item.url,
            filename: filenameFromUrl(item.url),
          });
        } else if (mode === "hls") {
        const st = await chrome.storage.sync.get(['hlsQuality','hlsLiveMinutes']);
        window.__activeDownloadUrl = item.url;
        await chrome.runtime.sendMessage({
          kind: "download-hls",
          url: item.url,
          options: { quality: st.hlsQuality || 'best', maxSeconds: Math.max(60, (parseInt(st.hlsLiveMinutes||60,10))*60) },
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
    // Thumbnails disabled per request

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

const __inlinePlayers = new WeakMap(); // videoEl -> { kind, hls, shaka }
let shakaInited = false;
function toggleInlinePreview(videoEl, containerEl, { url, kind }) {
  if (!videoEl || !containerEl) return;
  const state = __inlinePlayers.get(videoEl) || {};
  const isOpen = containerEl.style.display !== 'none';
  if (isOpen) {
    destroyInline(videoEl, containerEl);
    return;
  }
  // Open
  containerEl.style.display = '';
  // Ensure previous destroyed
  destroyInline(videoEl, containerEl);
  videoEl.muted = true; // allow autoplay without gesture
  if (kind === 'hls' && window.Hls && window.Hls.isSupported()) {
    const h = new window.Hls({
      maxBufferLength: 30,
      lowLatencyMode: true,
      enableWorker: true,
      fetchSetup: (ctx, init) => Object.assign(init || {}, { credentials: 'include' }),
      xhrSetup: (xhr) => { try { xhr.withCredentials = true; } catch {} }
    });
    h.loadSource(url);
    h.attachMedia(videoEl);
    h.on(window.Hls.Events.MANIFEST_PARSED, () => tryPlay(videoEl));
    __inlinePlayers.set(videoEl, { kind, hls: h });
  } else if (kind === 'hls' && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url;
    tryPlay(videoEl);
    __inlinePlayers.set(videoEl, { kind });
  } else if (kind === 'dash' && window.shaka) {
    if (!shakaInited) { window.shaka.polyfill.installAll(); shakaInited = true; }
    try {
      const p = new window.shaka.Player(videoEl);
      try { p.getNetworkingEngine().registerRequestFilter((type, request) => { request.allowCrossSiteCredentials = true; }); } catch {}
      p.load(url).then(() => tryPlay(videoEl)).catch(() => { chrome.tabs.create({ url }); });
      __inlinePlayers.set(videoEl, { kind, shaka: p });
    } catch {
      chrome.tabs.create({ url });
    }
  } else {
    videoEl.src = url;
    tryPlay(videoEl);
    __inlinePlayers.set(videoEl, { kind });
  }
}

function tryPlay(videoEl) {
  try { const p = videoEl.play(); if (p && p.catch) p.catch(()=>{}); } catch {}
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

function getAllTabs() {
  return new Promise((resolve) => chrome.tabs.query({}, resolve));
}

async function openTabPicker() {
  const panel = document.getElementById('tabPicker');
  if (!panel) return;
  panel.style.display = '';
  const closeBtn = document.getElementById('closeTabPicker');
  const search = document.getElementById('tabSearch');
  if (closeBtn) closeBtn.onclick = () => { panel.style.display = 'none'; };
  if (search && !search.__bound) {
    search.__bound = true;
    search.addEventListener('input', () => renderTabPicker());
  }
  await renderTabPicker();
}

async function renderTabPicker() {
  const list = document.getElementById('tabList');
  const search = document.getElementById('tabSearch');
  if (!list) return;
  const tabs = await getAllTabs();
  const rec = await chrome.runtime.sendMessage({ kind: 'get-recording-status' });
  const active = new Set((rec && rec.active) || []);
  const q = (search?.value || '').toLowerCase();
  list.innerHTML = '';
  for (const t of tabs) {
    if (!t || !t.id) continue;
    const title = t.title || t.url || `Tab ${t.id}`;
    if (q && !title.toLowerCase().includes(q)) continue;
    const li = document.createElement('li');
    li.className = 'tab-item';
    li.innerHTML = `
      <div class="left">
        <img class="fav" src="${t.favIconUrl || ''}" onerror="this.style.display='none'"/>
        <div class="title">${escapeHtml(title)}</div>
        <div class="meta">${t.active ? 'Active' : 'Inactive'} • Window ${t.windowId}</div>
      </div>
      <div class="actions">
        <button class="switch">Switch</button>
        <button class="rec">${active.has(t.id) ? 'Recording…' : 'Record'}</button>
      </div>
    `;
    li.querySelector('.switch').onclick = async () => {
      await chrome.windows.update(t.windowId, { focused: true });
      await chrome.tabs.update(t.id, { active: true });
    };
    const recBtn = li.querySelector('.rec');
    if (active.has(t.id)) recBtn.textContent = 'Stop';
    recBtn.onclick = async () => {
      if (active.has(t.id)) {
        await chrome.runtime.sendMessage({ kind: 'record-stop', tabId: t.id });
        recBtn.textContent = 'Record'; active.delete(t.id);
      } else {
        const resp = await chrome.runtime.sendMessage({ kind: 'record-start', tabId: t.id, options: { mode: 'tab', tabAudio: true } });
        if (resp && resp.error) alert(resp.error);
        else recBtn.textContent = 'Stop', active.add(t.id);
      }
    };
    list.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function setupRecPanel() {
  const startBtn = document.getElementById('recStartBtn');
  const stopBtn = document.getElementById('recStopBtn');
  if (startBtn) startBtn.onclick = async () => {
    const tab = await getActiveTab();
    const modeSel = document.getElementById('recMode');
    const mode = modeSel ? modeSel.value : 'tab';
    const resp = await chrome.runtime.sendMessage({ kind: 'record-start', tabId: tab.id, options: { mode } });
    if (resp && resp.error) alert(resp.error);
  };
  if (stopBtn) stopBtn.onclick = async () => {
    const tab = await getActiveTab();
    await chrome.runtime.sendMessage({ kind: 'record-stop', tabId: tab.id });
  };
}

function updateRecPanel(activeIds) {
  const state = document.getElementById('recState');
  const startBtn = document.getElementById('recStartBtn');
  const stopBtn = document.getElementById('recStopBtn');
  const isActive = Array.isArray(activeIds) && activeIds.includes(window.__activeTabId);
  if (state) state.textContent = isActive ? 'Recording' : 'Idle';
  if (startBtn) startBtn.disabled = isActive;
  if (stopBtn) stopBtn.disabled = !isActive;
}
