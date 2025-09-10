import { filenameFromUrl } from "../utils/common.js";

const recordingsTabBtn = document.getElementById("recordingsTab");
const videosTabBtn = document.getElementById("videosTab");
const listEl = document.getElementById("list");
const tpl = document.getElementById("item-tpl");
const recordingTpl = document.getElementById("recording-tpl");

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
      if (item.type === 'mse') {
        modeSel.style.display = 'none';
        dlBtn.textContent = 'Record Tab';
        dlBtn.onclick = async () => {
          await chrome.runtime.sendMessage({ kind: 'record-start', tabId });
        };
        if (playBtn) {
          playBtn.textContent = 'Open';
          playBtn.onclick = () => chrome.tabs.create({ url: item.url });
        }
      } else {
        if (playBtn) { playBtn.onclick = () => chrome.tabs.create({ url: item.url }); }
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
    const storage = await chrome.storage.local.get("recordings");
    const recordings = storage.recordings || [];
    for (const rec of recordings) {
      const li = recordingTpl.content.firstElementChild.cloneNode(true);
      li.querySelector(".name").textContent = rec.filename;
      li.querySelector(".timestamp").textContent = new Date(rec.timestamp).toLocaleString();

      const dlBtn = li.querySelector(".dl");
      dlBtn.onclick = async () => {
        await chrome.downloads.download({ url: rec.url, filename: rec.filename });
      };

      listEl.appendChild(li);
    }
  }
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
