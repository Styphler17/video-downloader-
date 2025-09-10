import { filenameFromUrl } from "../utils/common.js";

const recordingsTabBtn = document.getElementById("recordingsTab");
const videosTabBtn = document.getElementById("videosTab");
const listEl = document.getElementById("list");
const tpl = document.getElementById("item-tpl");
const recordingTpl = document.getElementById("recording-tpl");

let currentTab = "videos";
let tabId = null;

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
    for (const item of res.items || []) {
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.querySelector(".type").textContent = item.type;
      li.querySelector(".name").textContent = filenameFromUrl(item.url);

      const modeSel = li.querySelector(".mode");
      const dlBtn = li.querySelector(".dl");
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

      // Generate thumbnail
      const imgEl = li.querySelector(".thumbnail");
      generateThumbnail(item.url)
        .then((thumbSrc) => {
          imgEl.src = thumbSrc;
        })
        .catch(() => {
          imgEl.src =
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zNWVtIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEwIj5ObyBUaHVtYjwvdGV4dD4KPHN2Zz4=";
        });

      listEl.appendChild(li);
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

async function generateThumbnail(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = url;
    video.currentTime = 1; // Seek to 1 second
    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, 64, 64);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    video.onerror = reject;
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

async function generateThumbnail(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = url;
    video.currentTime = 1; // Seek to 1 second
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 64, 64);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    video.onerror = reject;
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
