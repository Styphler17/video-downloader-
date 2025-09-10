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
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.querySelector(".type").textContent = item.type;
    li.querySelector(".name").textContent = item.type === 'mse' ? 'MSE stream detected (use Record Tab)' : filenameFromUrl(item.url);

    const modeSel = li.querySelector(".mode");
    const dlBtn = li.querySelector(".dl");
    if (item.type === 'mse') {
      // Suggest recording for MSE streams
      modeSel.style.display = 'none';
      dlBtn.textContent = 'Record Tab';
      dlBtn.onclick = startRecord;
    } else {
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
    generateThumbnail(item.url).then(thumbSrc => {
      imgEl.src = thumbSrc;
    }).catch(() => {
      imgEl.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zNWVtIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEwIj5ObyBUaHVtYjwvdGV4dD4KPHN2Zz4="; // Placeholder
    });

    listEl.appendChild(li);
  }
}

async function generateThumbnail(videoUrl) {
  return new Promise((resolve, reject) => {
    if (videoUrl.startsWith('chrome://') || videoUrl.startsWith('chrome-extension://')) {
      reject(new Error('Cannot access chrome:// or chrome-extension:// URLs'));
      return;
    }
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = videoUrl;
    video.currentTime = 1; // Seek to 1 second
    video.onloadedmetadata = () => {
      if (video.videoWidth === 0) {
        reject(new Error('Video has no dimensions'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = (64 / video.videoWidth) * video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      resolve(dataUrl);
    };
    video.onerror = reject;
    video.load();
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
