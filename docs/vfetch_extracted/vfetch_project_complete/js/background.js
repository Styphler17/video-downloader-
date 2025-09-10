// Service Worker for AnyVideo Extension
// This service worker handles background tasks, network monitoring, and tab management

// Constants
const MAX_VIDEO_STORE_SIZE = 100;
const STORAGE_KEY = 'vfetch_videos';

// VFetchProBackgroundService: Advanced background logic for Universal Video Fetcher Pro

const VFETCHPRO_OPTION = {
  size: { min: 500 * 1024, max: 0 },
  domain: [],
  noAddDomainTip: false,
  noRecordTip: false,
  lang: ["en"],
  site: "https://vfetch.dev"
};

class VFetchProBackgroundService {
  constructor() {
    this.perTabStorage = {};
    this.recordingTabs = new Set(); // Track which tabs are recording
    this.init();
  }

  async init() {
    this.setupWebRequestListener();
    this.setupMessageListener();
    this.setupTabListeners();
    this.setupGlobalHotkeys();
    this.updateBadgeAll();
    this.setupPeriodicCleanup();
    this.setupServiceWorkerHandlers();
  }

  setupWebRequestListener() {
    chrome.webRequest.onResponseStarted.addListener(
      this.handleWebRequest.bind(this),
      { urls: ["<all_urls>"], types: ["media", "xmlhttprequest", "object", "other"] },
      ["responseHeaders"]
    );
  }

  handleWebRequest(details) {
    try {
      const { tabId, url, responseHeaders, type } = details;
      if (tabId < 0 || !url.startsWith("http")) return;
      
      // Check if tab still exists before processing
      chrome.tabs.get(tabId).then(() => {
        const hostname = new URL(url).hostname;
        if (VFETCHPRO_OPTION.domain.includes(hostname)) return;
        // Only allow video/audio types and HLS streams
        const contentType = (responseHeaders.find(h => h.name.toLowerCase() === "content-type") || {}).value || "";
        const isHLS = url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/vnd.apple.mpegurl');
        if (!/video|audio|mpegurl|octet-stream/i.test(contentType) && !isHLS) return;
        // Size filter
        const contentLength = parseInt((responseHeaders.find(h => h.name.toLowerCase() === "content-length") || {}).value || "0");
        if (VFETCHPRO_OPTION.size.min && contentLength < VFETCHPRO_OPTION.size.min) return;
        if (VFETCHPRO_OPTION.size.max && VFETCHPRO_OPTION.size.max > 0 && contentLength > VFETCHPRO_OPTION.size.max) return;
        // Store per tab
        const storageKey = `vfetchpro_tab_${tabId}`;
        chrome.storage.local.get([storageKey], data => {
          let tabData = data[storageKey] || {};
          if (Object.values(tabData).some(item => item.url === url)) return;
          const id = details.requestId;
          tabData[id] = {
            url,
            contentType,
            size: contentLength,
            type,
            name: hostname + url.substring(url.lastIndexOf("/")),
            detectedAt: Date.now()
          };
          chrome.storage.local.set({ [storageKey]: tabData }, () => {
            this.updateBadge(tabId, Object.keys(tabData).length);
            // Only send message if popup is open
            chrome.runtime.sendMessage({ cmd: "VFETCHPRO_POPUP_UPDATE", parameter: { tabId } }).catch(() => {
              // Popup is not open, which is normal
            });
          });
        });
      }).catch((error) => {
        // Tab doesn't exist, clean up storage silently
        const storageKey = `vfetchpro_tab_${tabId}`;
        chrome.storage.local.remove([storageKey]);
      });
    } catch (e) {
      // General error handling
      console.warn('Error in handleWebRequest:', e);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const { cmd, parameter } = msg;
      switch (cmd) {
        case "VFETCHPRO_FETCH_RESOURCES":
          this.getTabResources(parameter.tabId, sendResponse);
          return true;
        case "VFETCHPRO_CLEAR_RESOURCES":
          this.clearTabResources(parameter.tabId, sendResponse);
          return true;
        case "VFETCHPRO_BLOCK_DOMAIN":
          this.blockDomain(parameter.domain, sendResponse);
          return true;
        case "VFETCHPRO_UNBLOCK_DOMAIN":
          this.unblockDomain(parameter.domain, sendResponse);
          return true;
        case "VFETCHPRO_DOWNLOAD":
          this.handleDownload(parameter.url, sendResponse);
          return true;
        case "VFETCHPRO_VIDEO_FOUND":
          this.handleVideoFound(parameter, sender.tab ? sender.tab.id : (parameter.tabId || null));
          sendResponse({ success: true });
          return true;
        case "VIDEO_DETECTED":
          this.handleVideoDetected(parameter, sender.tab ? sender.tab.id : null);
          sendResponse({ success: true });
          return true;
        case "VIDEO_EVENT":
          this.handleVideoEvent(parameter, sender.tab ? sender.tab.id : null);
          sendResponse({ success: true });
          return true;
        case "OFFSCREEN_RECORDING_STARTED":
          this.handleOffscreenRecordingStarted(parameter);
          sendResponse({ success: true });
          return true;
        case "OFFSCREEN_RECORDING_COMPLETED":
          this.handleOffscreenRecordingCompleted(parameter);
          sendResponse({ success: true });
          return true;
      }
    });
  }

  getTabResources(tabId, sendResponse) {
    const storageKey = `vfetchpro_tab_${tabId}`;
    chrome.storage.local.get([storageKey], data => {
      sendResponse({ resources: data[storageKey] || {} });
    });
  }

  clearTabResources(tabId, sendResponse) {
    const storageKey = `vfetchpro_tab_${tabId}`;
    chrome.storage.local.remove([storageKey], () => {
      this.updateBadge(tabId, 0);
      sendResponse({ success: true });
    });
  }

  blockDomain(domain, sendResponse) {
    if (!VFETCHPRO_OPTION.domain.includes(domain)) {
      VFETCHPRO_OPTION.domain.push(domain);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }

  unblockDomain(domain, sendResponse) {
    const idx = VFETCHPRO_OPTION.domain.indexOf(domain);
    if (idx > -1) {
      VFETCHPRO_OPTION.domain.splice(idx, 1);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }

  handleDownload(url, sendResponse) {
    if (!url) {
      sendResponse({ success: false, error: 'No URL provided' });
      return;
    }

    try {
      const filename = url.split('/').pop().split('?')[0] || 'video.mp4';
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleOffscreenRecordingStarted(parameter) {
    console.log('Offscreen recording started:', parameter);
    // Update badge or show notification
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  }

  handleOffscreenRecordingCompleted(parameter) {
    console.log('Offscreen recording completed:', parameter);
    // Clear badge and show success notification
    chrome.action.setBadgeText({ text: '' });
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'img/icon48.png',
              title: 'AnyVideo',
      message: `Recording saved: ${parameter.filename}`
    });
  }

  setupTabListeners() {
    chrome.tabs.onRemoved.addListener(tabId => {
      try {
        const storageKey = `vfetchpro_tab_${tabId}`;
        chrome.storage.local.remove([storageKey]);
        this.recordingTabs.delete(tabId);
        // Don't call updateBadge for removed tabs as it will cause errors
      } catch (error) {
        console.warn('Error cleaning up removed tab:', error);
      }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "loading") {
        try {
          const storageKey = `vfetchpro_tab_${tabId}`;
          chrome.storage.local.remove([storageKey]);
          this.recordingTabs.delete(tabId);
          // Don't call updateBadge for loading tabs as it might cause errors
        } catch (error) {
          console.warn('Error cleaning up loading tab:', error);
        }
      }
    });
  }

  updateBadge(tabId, count) {
    // Check if tab exists before updating badge
    chrome.tabs.get(tabId).then(() => {
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId }).catch(() => {
        // Ignore badge update errors
      });
      chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId }).catch(() => {
        // Ignore badge update errors
      });
      chrome.action.setBadgeTextColor && chrome.action.setBadgeTextColor({ color: "#FFFFFF", tabId }).catch(() => {
        // Ignore badge update errors
      });
    }).catch((error) => {
      // Tab doesn't exist, remove from storage silently
      const storageKey = `vfetchpro_tab_${tabId}`;
      chrome.storage.local.remove([storageKey]);
      // Don't log this as an error since it's expected behavior
    });
  }

  updateBadgeAll() {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        const storageKey = `vfetchpro_tab_${tab.id}`;
        chrome.storage.local.get([storageKey], data => {
          const count = data[storageKey] ? Object.keys(data[storageKey]).length : 0;
          this.updateBadge(tab.id, count);
        });
      });
    });
  }

  handleVideoFound(parameter, tabId) {
    if (!tabId || !parameter || !parameter.url) return;
    
    // Check if tab still exists before processing
    chrome.tabs.get(tabId).then(() => {
      const storageKey = `vfetchpro_tab_${tabId}`;
      chrome.storage.local.get([storageKey], data => {
        let tabData = data[storageKey] || {};
        // Use a unique key for each video (by url + timestamp)
        const id = `${parameter.url}_${parameter.detectedAt || Date.now()}`;
        tabData[id] = {
          url: parameter.url,
          contentType: parameter.contentType || '',
          size: parameter.size || 0,
          type: parameter.type || '',
          name: parameter.name || '',
          detectedAt: parameter.detectedAt || Date.now(),
          sources: parameter.sources || [],
          resolutions: parameter.resolutions || []
        };
        
        chrome.storage.local.set({ [storageKey]: tabData }, () => {
          this.updateBadge(tabId, Object.keys(tabData).length);
          // Only send message if popup is open
          chrome.runtime.sendMessage({ cmd: "VFETCHPRO_POPUP_UPDATE", parameter: { tabId } }).catch(() => {
            // Popup is not open, which is normal
          });
        });
      });
    }).catch((error) => {
      // Tab doesn't exist, clean up storage silently
      const storageKey = `vfetchpro_tab_${tabId}`;
      chrome.storage.local.remove([storageKey]);
    });
  }

  handleVideoDetected(parameter, tabId) {
    if (!tabId || !parameter || !parameter.url) return;
    
    // Check if tab still exists before processing
    chrome.tabs.get(tabId).then(() => {
      const storageKey = `vfetchpro_tab_${tabId}`;
      chrome.storage.local.get([storageKey], data => {
        let tabData = data[storageKey] || {};
        const id = `detected_${Date.now()}`;
        
        // Determine content type based on type
        let contentType = 'video/mp4';
        if (parameter.type === 'hls') {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (parameter.type === 'video') {
          contentType = 'video/mp4';
        }
        
        tabData[id] = {
          url: parameter.url,
          contentType,
          size: 0, // Size unknown for detected videos
          type: parameter.type,
          name: parameter.title || new URL(parameter.url).hostname + parameter.url.substring(parameter.url.lastIndexOf("/")),
          detectedAt: Date.now(),
          requestId: id,
          duration: parameter.duration,
          videoWidth: parameter.videoWidth,
          videoHeight: parameter.videoHeight
        };
        
        chrome.storage.local.set({ [storageKey]: tabData }, () => {
          this.updateBadge(tabId, Object.keys(tabData).length);
          // Notify popup if open
          chrome.runtime.sendMessage({ 
            cmd: "VFETCHPRO_POPUP_UPDATE", 
            parameter: { tabId } 
          }).catch(() => {
            // Popup not open, which is normal
          });
        });
      });
    }).catch((error) => {
      // Tab doesn't exist, clean up storage silently
      const storageKey = `vfetchpro_tab_${tabId}`;
      chrome.storage.local.remove([storageKey]);
    });
  }

  handleVideoEvent(parameter, tabId) {
    if (!tabId) return;
    
    // Handle video events like play, pause, etc.
    console.log('Video event:', parameter);
    
    // You can add specific handling for different events here
    // For example, track video playback, update metadata, etc.
  }

  setupGlobalHotkeys() {
    // Listen for commands from manifest.json
    chrome.commands.onCommand.addListener((command) => {
      console.log('Global hotkey pressed:', command);
      
      switch (command) {
        case 'start-stop-recording':
          this.openOffscreenPage();
          break;
        case 'stop-all-recordings':
          this.openOffscreenPage();
          break;
        case 'pause-resume-recording':
          this.openOffscreenPage();
          break;
      }
    });
  }

  openOffscreenPage() {
    // Open the offscreen recording page
    chrome.tabs.create({
      url: chrome.runtime.getURL('offscreen.html')
    });
  }

  setupPeriodicCleanup() {
    // Clean up orphaned tab data every 5 minutes
    setInterval(() => {
      this.cleanupOrphanedTabData();
    }, 5 * 60 * 1000);
  }

  async cleanupOrphanedTabData() {
    try {
      // Get all storage keys
      const allData = await chrome.storage.local.get(null);
      const tabKeys = Object.keys(allData).filter(key => key.startsWith('vfetchpro_tab_'));
      
      // Get all current tab IDs
      const tabs = await chrome.tabs.query({});
      const currentTabIds = new Set(tabs.map(tab => tab.id));
      
      // Find orphaned tab keys
      const orphanedKeys = tabKeys.filter(key => {
        const tabId = parseInt(key.replace('vfetchpro_tab_', ''));
        return !currentTabIds.has(tabId);
      });
      
      // Remove orphaned data
      if (orphanedKeys.length > 0) {
        await chrome.storage.local.remove(orphanedKeys);
        console.log(`Cleaned up ${orphanedKeys.length} orphaned tab data entries`);
      }
    } catch (error) {
      console.warn('Error during periodic cleanup:', error);
    }
  }

  setupServiceWorkerHandlers() {
    // Handle service worker lifecycle events
    self.addEventListener('beforeinstallprompt', (event) => {
      console.log('Service Worker beforeinstallprompt event');
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
    });

    // Handle service worker errors
    self.addEventListener('error', (event) => {
      console.error('Service Worker error:', event.error);
    });

    // Handle unhandled promise rejections
    self.addEventListener('unhandledrejection', (event) => {
      console.error('Service Worker unhandled rejection:', event.reason);
    });
  }
}

// Initialize the background service
const backgroundService = new VFetchProBackgroundService();

// State management
class VideoStore {
  constructor() {
    this.videos = [];
    this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      this.videos = data[STORAGE_KEY] || [];
    } catch (error) {
      console.error('Failed to load videos from storage:', error);
      this.videos = [];
    }
  }

  async saveToStorage() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.videos });
    } catch (error) {
      console.error('Failed to save videos to storage:', error);
    }
  }

  addVideo(url) {
    if (!url || this.videos.some(v => v.url === url)) return false;
    
    this.videos.push({
      url,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });

    if (this.videos.length > MAX_VIDEO_STORE_SIZE) {
      this.videos = this.videos.slice(-MAX_VIDEO_STORE_SIZE);
    }

    this.saveToStorage();
    return true;
  }

  clear() {
    this.videos = [];
    this.saveToStorage();
  }

  getAll() {
    return [...this.videos];
  }
}

// Initialize video store
const videoStore = new VideoStore();

// --- Network-based video detection logic ---
const detectedRequests = {};
const validVideoTypes = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/x-flv', 'video/x-matroska',
  'application/vnd.apple.mpegurl', 'application/x-mpegurl', 'application/dash+xml',
  'audio/mpeg', 'audio/wav', 'audio/ogg'
];
const validExtensions = [
  'mp4', 'webm', 'ogg', 'ogv', 'flv', 'mkv', 'm3u8', 'mpd', 'mp3', 'wav'
];
const minVideoSize = 500 * 1024; // 500KB default min size

function getExtension(url) {
  try {
    return url.split('.').pop().split(/[?#]/)[0].toLowerCase();
  } catch {
    return '';
  }
}

function isManifest(url, contentType) {
  return (
    url.endsWith('.m3u8') || url.endsWith('.mpd') ||
    contentType.includes('mpegurl') || contentType.includes('dash+xml')
  );
}

function isSegment(url) {
  return /\.ts(\?|$)/.test(url) || /\.m4s(\?|$)/.test(url) || /seg\d+/.test(url) || /chunk/.test(url);
}

chrome.webRequest.onResponseStarted.addListener(async function(details) {
  const { tabId, url, responseHeaders, type, requestId } = details;
  if (tabId < 0 || !url.startsWith('http')) return;

  // Only allow video/audio types
  const contentType = (responseHeaders.find(h => h.name.toLowerCase() === 'content-type') || {}).value || '';
  const ext = getExtension(url);
  if (!validVideoTypes.some(t => contentType.includes(t)) && !validExtensions.includes(ext)) return;

  // Filter out segments/chunks
  if (isSegment(url)) return;

  // For HLS/DASH, only store the manifest, not the segments
  if (isManifest(url, contentType)) {
    // Only store if not already present
    // (Allow multiple manifests per tab, but not duplicates)
  } else {
    // For progressive, check size
    const contentLength = parseInt((responseHeaders.find(h => h.name.toLowerCase() === 'content-length') || {}).value || '0');
    if (minVideoSize && contentLength < minVideoSize) return;
  }

  // Store per tab
  const storageKey = `vfetchpro_tab_${tabId}`;
  chrome.storage.local.get([storageKey], data => {
    let tabData = data[storageKey] || {};
    // Avoid duplicates
    if (Object.values(tabData).some(item => item.url === url)) return;
    const id = requestId;
    tabData[id] = {
      url,
      contentType,
      size: parseInt((responseHeaders.find(h => h.name.toLowerCase() === 'content-length') || {}).value || '0'),
      type,
      name: url.split('/').pop().split(/[?#]/)[0],
      detectedAt: Date.now(),
      requestId: id
    };
    chrome.storage.local.set({ [storageKey]: tabData }, () => {
      // Notify popup if open
      chrome.runtime.sendMessage({
        cmd: 'POPUP_APPEND_ITEMS',
        parameter: { tab: tabId, item: { [id]: tabData[id] } }
      }).catch(() => {});
    });
  });
}, {
  urls: ['<all_urls>'],
  types: ['media', 'xmlhttprequest', 'object', 'other']
}, ['responseHeaders']);

// Service Worker Event Listeners
self.addEventListener('install', (event) => {
  console.log('AnyVideo Service Worker installed');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('AnyVideo Service Worker activated');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Message handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.cmd) {
    case 'VIDEO_FOUND':
      if (videoStore.addVideo(msg.parameter?.url)) {
        chrome.runtime.sendMessage({
          cmd: 'VIDEO_ADDED',
          parameter: { url: msg.parameter.url }
        });
      }
      break;

    case 'FETCH_VIDEOS':
      sendResponse({ videos: videoStore.getAll() });
      break;

    case 'CLEAR_VIDEOS':
      videoStore.clear();
      sendResponse({ success: true });
      break;

    case 'START_RECORDING':
      handleRecordingStart(msg.parameter.tabId, sendResponse);
      return true; // Keep the message channel open for async response
  }
});

// Recording functionality
async function handleRecordingStart(tabId, sendResponse) {
  try {
    // Inject the recorder script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['js/recorder.js']
    });

    // Start recording
    await chrome.tabs.sendMessage(tabId, {
      cmd: 'REC_START',
      parameter: { tabId }
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Recording start failed:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Handle fetch events for offline support
self.addEventListener('fetch', (event) => {
  // Only handle requests for extension resources
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(event.request);
        })
        .catch(() => {
          // Return a fallback response if both cache and network fail
          return new Response('Offline - Extension resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
  }
});

// Handle background sync (if needed in the future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: 'img/icon48.png',
        badge: 'img/icon16.png'
      })
    );
  }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set up initial storage
    await chrome.storage.local.set({
      [STORAGE_KEY]: [],
      settings: {
        maxVideoSize: MAX_VIDEO_STORE_SIZE,
        autoDownload: false,
        showNotifications: true
      }
    });
  }
}); 