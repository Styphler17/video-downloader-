
class VFetchPopupUI {
  constructor() {
    this.tab = null;
    this.init();
  }

  async init() {
    this.tab = await this.getCurrentTab();
    this.setupEvents();
    this.renderVideoList();
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  setupEvents() {
    document.getElementById("vfetch-record-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ cmd: "START_RECORDING", parameter: { tabId: this.tab.id } });
    });

    document.getElementById("vfetch-preview-modal").addEventListener("click", () => {
      document.getElementById("vfetch-preview-modal").style.display = "none";
      const player = document.getElementById("vfetch-preview-player");
      player.pause();
      player.src = "";
    });
  }

  renderVideoList() {
    const container = document.getElementById("vfetch-video-list");
    chrome.runtime.sendMessage({ cmd: "FETCH_VIDEOS" }, (response) => {
      container.innerHTML = "";
      if (response && response.videos && response.videos.length > 0) {
        response.videos.forEach((video, index) => {
          const div = document.createElement("div");
          div.className = "video-entry";
          div.innerHTML = `
            <span>#${index + 1} - ${video.url}</span>
            <div>
              <button class="btn btn-sm btn-primary me-1" data-url="${video.url}">▶️</button>
              <button class="btn btn-sm btn-success" onclick="chrome.downloads.download({ url: '${video.url}' })">⬇️</button>
            </div>
          `;
          div.querySelector("button[data-url]").addEventListener("click", (e) => {
            const url = e.target.getAttribute("data-url");
            const player = document.getElementById("vfetch-preview-player");
            const modal = document.getElementById("vfetch-preview-modal");
            player.src = url;
            modal.style.display = "flex";
          });
          container.appendChild(div);
        });
      } else {
        container.innerHTML = "<p class='text-muted'>No videos found.</p>";
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new VFetchPopupUI());
