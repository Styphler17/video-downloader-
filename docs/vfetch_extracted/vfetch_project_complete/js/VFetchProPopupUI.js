class VFetchProPopupUI {
  constructor() {
    this.videos = [];
    this.settings = {};
    this.blockedDomains = [];
    this.init();
  }

  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.updateStats();
    this.renderVideoList();
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('vfetchpro-settings-btn').addEventListener('click', () => {
      this.showSettings();
    });

    // Settings close button
    document.getElementById('vfetchpro-settings-close').addEventListener('click', () => {
      this.hideSettings();
    });

    // Visit site button
    document.getElementById('vfetchpro-visit-site-btn').addEventListener('click', () => {
              chrome.tabs.create({ url: 'https://anyvideo.com' });
    });

    // Info button
    document.getElementById('vfetchpro-info-btn').addEventListener('click', () => {
      this.showInfo();
    });

    // Settings form
    document.getElementById('vfetchpro-settings-form').addEventListener('change', (e) => {
      this.handleSettingChange(e);
    });

    // Block domain button
    document.getElementById('vfetchpro-block-domain-btn').addEventListener('click', () => {
      this.blockDomain();
    });

    // Video list event delegation
    document.getElementById('vfetchpro-video-list').addEventListener('click', (e) => {
      this.handleVideoAction(e);
    });

    // Listen for messages from background script and content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // Load videos for current tab on popup open
    this.loadCurrentTabVideos();
  }







  renderVideoList() {
    const videoList = document.getElementById('vfetchpro-video-list');
    const emptyState = document.getElementById('vfetchpro-empty-state');

    if (this.videos.length === 0) {
      videoList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    videoList.style.display = 'block';
    emptyState.style.display = 'none';

    videoList.innerHTML = this.videos.map((video, index) => `
      <div class="vfetchpro-video-entry" data-video-index="${index}">
        <div class="vfetchpro-video-info">
          <div class="vfetchpro-thumbnail-container">
            ${video.thumbnail ? 
              `<img src="${video.thumbnail}" alt="Video thumbnail" onerror="this.parentElement.innerHTML='<div class=\\'vfetchpro-thumbnail-placeholder\\'><i class=\\'bi bi-play-circle\\'></i></div>'">` :
              `<div class="vfetchpro-thumbnail-placeholder"><i class="bi bi-play-circle"></i></div>`
            }
          </div>
          <div class="vfetchpro-video-details">
            <div class="vfetchpro-video-title">${this.escapeHtml(video.title || 'Untitled Video')}</div>
            <div class="vfetchpro-video-url">${this.escapeHtml(video.url)}</div>
            <div class="vfetchpro-video-meta">
              <span><i class="bi bi-file-earmark"></i> ${this.formatFileSize(video.size)}</span>
              <span><i class="bi bi-clock"></i> ${video.duration || 'Unknown'}</span>
            </div>
          </div>
        </div>
        <div class="vfetchpro-video-actions">
          <button class="vfetchpro-action-btn vfetchpro-preview-btn" data-action="preview" data-video-index="${index}">
            <i class="bi bi-play-circle"></i> Preview
          </button>
          <button class="vfetchpro-action-btn vfetchpro-download-btn" data-action="download" data-video-index="${index}">
            <i class="bi bi-download"></i> Download
          </button>
          <button class="vfetchpro-action-btn vfetchpro-copy-btn" data-action="copy" data-video-index="${index}">
            <i class="bi bi-clipboard"></i> Copy URL
          </button>
          <button class="vfetchpro-action-btn vfetchpro-block-btn" data-action="block" data-video-index="${index}">
            <i class="bi bi-shield-x"></i> Block Domain
          </button>
        </div>
        <div class="vfetchpro-video-player" id="video-player-${index}" style="display: none; margin-top: 16px; border-radius: var(--border-radius-sm); overflow: hidden; background: #000;"></div>
      </div>
    `).join('');
  }

  handleVideoAction(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const videoIndex = e.target.closest('[data-video-index]')?.dataset.videoIndex;
    
    if (!action || videoIndex === undefined) return;

    const video = this.videos[parseInt(videoIndex)];
    if (!video) {
      console.error('Video not found for index:', videoIndex);
      return;
    }

    console.log('Video action:', action, 'for video:', video);

    switch (action) {
      case 'preview':
        this.handlePreview(video, videoIndex);
        break;
      case 'download':
        this.handleDownload(video);
        break;
      case 'copy':
        this.handleCopyUrl(video);
        break;
      case 'block':
        this.handleBlockDomain(video);
        break;
    }
  }

  async handlePreview(video, videoIndex) {
    const playerContainer = document.getElementById(`video-player-${videoIndex}`);
    
    if (!playerContainer) {
      console.error('Player container not found');
      return;
    }
    
    if (playerContainer.style.display === 'none' || playerContainer.style.display === '') {
      playerContainer.style.display = 'block';
      
      // Show loading state
      playerContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 120px; color: #666;">Loading video...</div>';
      
      try {
        // Check if URL is accessible
        const response = await fetch(video.url, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('Video URL not accessible');
        }
        
        // Create video element with proper attributes
        const videoElement = document.createElement('video');
        videoElement.controls = true;
        videoElement.crossOrigin = 'anonymous';
        videoElement.style.width = '100%';
        videoElement.style.maxHeight = '200px';
        videoElement.style.objectFit = 'contain';
        videoElement.style.borderRadius = 'var(--border-radius-sm)';
        
        // Add source
        const source = document.createElement('source');
        source.src = video.url;
        source.type = video.contentType || 'video/mp4';
        videoElement.appendChild(source);
        
        // Add fallback text
        videoElement.textContent = 'Your browser does not support the video tag.';
        
        // Clear container and add video
        playerContainer.innerHTML = '';
        playerContainer.appendChild(videoElement);
        
        // Add error handling
        videoElement.addEventListener('error', (e) => {
          console.error('Video preview error:', e);
          this.showToast('Failed to load video preview - CORS or access issue', 'error');
          playerContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 120px; color: #666; text-align: center;">
              <div>Video cannot be previewed due to CORS restrictions</div>
              <button onclick="window.open('${video.url}', '_blank')" style="margin-top: 8px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: var(--border-radius-sm); cursor: pointer;">
                Open in New Tab
              </button>
            </div>
          `;
        });
        
        // Add load handling
        videoElement.addEventListener('loadeddata', () => {
          console.log('Video preview loaded successfully');
        });
        
        // Try to load the video
        await videoElement.load();
        
              } catch (error) {
          console.error('Failed to load video:', error);
          this.showToast('Cannot preview video - opening in new tab instead', 'error');
          playerContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 120px; color: #666; text-align: center;">
              <div>Video cannot be previewed</div>
              <button onclick="window.open('${video.url}', '_blank')" style="margin-top: 8px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: var(--border-radius-sm); cursor: pointer;">
                Open in New Tab
              </button>
            </div>
          `;
        }
    } else {
      playerContainer.style.display = 'none';
    }
  }

  async handleDownload(video) {
    try {
      const link = document.createElement('a');
      link.href = video.url;
      link.download = this.getFileName(video.url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showToast('Failed to download video', 'error');
    }
  }

  async handleCopyUrl(video) {
    try {
      await navigator.clipboard.writeText(video.url);
      this.showToast('URL copied to clipboard', 'success');
    } catch (error) {
      console.error('Copy error:', error);
      this.showToast('Failed to copy URL', 'error');
    }
  }

  async handleBlockDomain(video) {
    const domain = this.extractDomain(video.url);
    if (domain && !this.blockedDomains.includes(domain)) {
      this.blockedDomains.push(domain);
      this.saveSettings();
      this.updateStats();
      this.showToast(`Blocked domain: ${domain}`, 'success');
    }
  }

  showSettings() {
    document.getElementById('vfetchpro-settings').classList.add('show');
    this.renderBlockedDomains();
  }

  hideSettings() {
    document.getElementById('vfetchpro-settings').classList.remove('show');
  }

  showInfo() {
    this.showToast('AnyVideo - Video Detection & Download Tool', 'success');
  }

  blockDomain() {
    const input = document.getElementById('vfetchpro-block-domain-input');
    const domain = input.value.trim();
    
    if (!domain) {
      this.showToast('Please enter a domain', 'error');
      return;
    }

    if (this.blockedDomains.includes(domain)) {
      this.showToast('Domain already blocked', 'error');
      return;
    }

    this.blockedDomains.push(domain);
    this.saveSettings();
    this.updateStats();
    this.renderBlockedDomains();
    input.value = '';
    this.showToast(`Blocked domain: ${domain}`, 'success');
  }

  renderBlockedDomains() {
    const list = document.getElementById('vfetchpro-blocked-domains');
    list.innerHTML = this.blockedDomains.map(domain => `
      <li>
        <span>${domain}</span>
        <button onclick="window.removeBlockedDomain('${domain}')" style="background: var(--danger-color); color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer;">
          Remove
        </button>
      </li>
    `).join('');
  }

  removeBlockedDomain(domain) {
    this.blockedDomains = this.blockedDomains.filter(d => d !== domain);
    this.saveSettings();
    this.updateStats();
    this.renderBlockedDomains();
    this.showToast(`Unblocked domain: ${domain}`, 'success');
  }

  updateStats() {
    document.getElementById('vfetchpro-videos-found').textContent = this.videos.length;
    document.getElementById('vfetchpro-domains-blocked').textContent = this.blockedDomains.length;
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('vfetchpro-toast-container');
    const toast = document.createElement('div');
    toast.className = `vfetchpro-toast ${type}`;
    
    const icon = type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle';
    
    toast.innerHTML = `
      <div class="vfetchpro-toast-icon">
        <i class="bi ${icon}"></i>
      </div>
      <div class="vfetchpro-toast-message">${message}</div>
      <button class="vfetchpro-toast-close">
        <i class="bi bi-x"></i>
      </button>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);

    // Close button functionality
    toast.querySelector('.vfetchpro-toast-close').addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  handleSettingChange(e) {
    const setting = e.target.id.replace('vfetchpro-', '');
    this.settings[setting] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    this.saveSettings();
  }

  loadSettings() {
    chrome.storage.sync.get(['vfetchpro_settings', 'vfetchpro_blocked_domains'], (result) => {
      this.settings = result.vfetchpro_settings || {};
      this.blockedDomains = result.vfetchpro_blocked_domains || [];
      
      // Apply settings to form
      Object.keys(this.settings).forEach(key => {
        const element = document.getElementById(`vfetchpro-${key}`);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = this.settings[key];
          } else {
            element.value = this.settings[key];
          }
        }
      });
    });
  }

  saveSettings() {
    chrome.storage.sync.set({
      vfetchpro_settings: this.settings,
      vfetchpro_blocked_domains: this.blockedDomains
    });
  }

  async loadCurrentTabVideos() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const storageKey = `vfetchpro_tab_${tab.id}`;
      chrome.storage.local.get([storageKey], (data) => {
        const tabData = data[storageKey] || {};
        this.videos = Object.values(tabData).map(video => ({
          url: video.url,
          title: video.name || 'Untitled Video',
          size: video.size || 0,
          duration: null,
          thumbnail: null,
          contentType: video.contentType || '',
          type: video.type || '',
          detectedAt: video.detectedAt || Date.now()
        }));
        this.renderVideoList();
        this.updateStats();
      });
    } catch (error) {
      console.error('Failed to load current tab videos:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    if (message.cmd === 'VFETCHPRO_POPUP_UPDATE') {
      // Background script is telling us videos were found
      this.loadCurrentTabVideos();
    } else if (message.action === 'videosFound') {
      // Content script found videos
      this.videos = message.videos || [];
      this.renderVideoList();
      this.updateStats();
      this.showToast(`Found ${this.videos.length} videos`, 'success');
    }
  }

  // Utility methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileName(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'video.mp4';
    } catch {
      return 'video.mp4';
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.vfetchproUI = new VFetchProPopupUI();
});

// Make removeBlockedDomain available globally
window.removeBlockedDomain = function(domain) {
  if (window.vfetchproUI) {
    window.vfetchproUI.removeBlockedDomain(domain);
  }
};