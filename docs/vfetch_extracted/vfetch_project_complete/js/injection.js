// Injection script that runs at document_start
// This injects hook.js for advanced video detection

let recorderTab = null;
let broadcastChannel = null;
let indicator = null;

// Check if we're in recording mode
try {
  recorderTab = localStorage.getItem("fv_recorder_tab");
} catch (e) {}

if (recorderTab) {
  recorderTab = parseInt(recorderTab);
  setTimeout(() => {
    localStorage.removeItem("fv_recorder_tab");
  }, 5000);
  
  broadcastChannel = new BroadcastChannel(`channel-${recorderTab}`);
  broadcastChannel.addEventListener("message", (event) => {
    if (event.origin === location.origin) {
      chrome.runtime.sendMessage({
        cmd: "REC_ON_DATA",
        parameter: { recorderTab, data: event.data }
      });
      
      if (indicator === null) {
        try {
          const doc = window.top.document;
          indicator = doc.createElement("div");
          indicator.style.width = "100%";
          indicator.style.height = "100%";
          indicator.style.position = "fixed";
          indicator.style.bottom = "0";
          indicator.style.right = "0";
          indicator.style.zIndex = "99999999";
          indicator.style.pointerEvents = "none";
          
          const img = new Image();
          img.width = 150;
          img.height = 150;
          img.src = chrome.runtime.getURL("img/recording.svg");
          img.style.position = "absolute";
          img.style.right = "10px";
          img.style.bottom = "10px";
          
          indicator.appendChild(img);
          doc.body.appendChild(indicator);
        } catch (e) {
          indicator = false;
        }
      }
    }
  });
  
  // Inject hook.js for advanced video detection
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("js/hook.js");
  document.documentElement.appendChild(script);
  
  window.addEventListener("beforeunload", (event) => {
    try {
      if (self === top) {
        chrome.runtime.sendMessage({
          cmd: "REC_STOP",
          parameter: { tabId: recorderTab }
        });
        localStorage.removeItem("fv_recorder_tab");
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    } catch (e) {}
  });
}

// Enhanced video detection function
function checkVideoUrl(url, baseUrl) {
  let found = false;
  
  const checkElement = (element) => {
    const videos = element.querySelectorAll("video");
    if (videos.length > 0) {
      for (const video of videos) {
        let videoSrc = video.src;
        if (!videoSrc) {
          const source = video.querySelector("source");
          if (source) {
            videoSrc = source.src;
          }
        }
        
        if (videoSrc) {
          if (!/^(http:\/\/|https:\/\/)/i.test(videoSrc)) {
            videoSrc = new URL(videoSrc, baseUrl);
          }
          if (videoSrc === url) {
            return true;
          }
        }
      }
    }
    
    const iframes = element.getElementsByTagName("iframe");
    for (let i = 0; i < iframes.length; i++) {
      try {
        found = checkElement(iframes[i].contentDocument || iframes[i].contentWindow.document) || found;
      } catch (e) {
        continue;
      }
    }
    
    return found;
  };
  
  return checkElement(document);
}

// Helper to check if a URL is a manifest (HLS/DASH)
function isManifestUrl(url) {
  return url && (url.endsWith('.m3u8') || url.endsWith('.mpd'));
}

// Helper to check if a URL is a segment (HLS/DASH or fragmented MP4)
function isSegmentUrl(url) {
  return url && (url.endsWith('.ts') || url.endsWith('.m4s') || /seg\d+/.test(url) || /chunk/.test(url));
}

// Message listener for content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { cmd, parameter } = message;
  
  switch (cmd) {
    case "REC_START":
      localStorage.setItem("fv_recorder_tab", parameter.tab);
      document.querySelectorAll('video[src^="blob:"]').forEach(video => {
        video.currentTime = 0;
      });
      setTimeout(() => {
        if (self === top) {
          sendResponse();
          window.location.reload();
        }
      }, 500);
      return true;
      
    case "REC_STOP":
      if (broadcastChannel) {
        broadcastChannel.postMessage({ cmd });
      }
      if (indicator) {
        indicator.remove();
      }
      sendResponse();
      return true;
      
    case "REC_SPEED_UP":
      const { speed } = parameter;
      document.querySelectorAll('video[src^="blob:"]').forEach(video => {
        if (!isNaN(video.duration)) {
          video.playbackRate = speed;
        }
      });
      sendResponse();
      return true;
      
    case "CHECK_VIDEO":
      const { url } = parameter;
      sendResponse(checkVideoUrl(url, window.location.href));
      return true;
  }
});

// Enhanced video detection with MutationObserver
const detectVideos = () => {
  const videoElements = document.querySelectorAll('video');
  
  videoElements.forEach(video => {
    const videoUrl = video.src || video.currentSrc;
    const isHLS = videoUrl.includes('.m3u8') || (video.querySelector('source[src*=".m3u8"]'));
    const isDASH = videoUrl.includes('.mpd') || (video.querySelector('source[src*=".mpd"]'));
    
    // Only send if duration is valid (not NaN, not Infinity, > 10s) or if it's a manifest
    if ((video.duration && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 10) || isManifestUrl(videoUrl)) {
      const videoData = {
        url: videoUrl,
        type: isHLS ? 'hls' : (isDASH ? 'dash' : 'video'),
        title: video.title || document.title,
        duration: video.duration || 0,
        currentTime: video.currentTime,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        playbackRate: video.playbackRate,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error
      };
      if (videoData.url && !isSegmentUrl(videoData.url)) {
        chrome.runtime.sendMessage({
          cmd: "VIDEO_DETECTED",
          parameter: videoData
        }).catch(() => {});
      }
    }
  });
};

// Watch for dynamic video additions
const observeVideoChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'VIDEO' || node.tagName === 'SOURCE') {
            detectVideos();
          } else if (node.querySelectorAll) {
            const videos = node.querySelectorAll('video, source[type*="video"], source[src*=".mp4"], source[src*=".webm"], source[src*=".m3u8"], source[type*="mpegurl"], source[type*="application/vnd.apple.mpegurl"]');
            if (videos.length > 0) {
              detectVideos();
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Enhanced iframe detection
const detectIframeVideos = () => {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      if (iframe.contentDocument) {
        const videos = iframe.contentDocument.querySelectorAll('video, source[type*="video"]');
        if (videos.length > 0) {
          detectVideos();
        }
      }
    } catch (e) {
      // Cross-origin iframe, can't access content
    }
  });
};

// Initialize everything
const initialize = () => {
  // Initial detection
  detectVideos();
  detectIframeVideos();
  
  // Start observing for changes
  observeVideoChanges();
  
  // Periodic detection for dynamic content
  setInterval(() => {
    detectVideos();
    detectIframeVideos();
  }, 5000);
  
  // Listen for video events
  document.addEventListener('play', (event) => {
    if (event.target.tagName === 'VIDEO') {
      const video = event.target;
      const videoData = {
        url: video.src || video.currentSrc,
        type: video.src.includes('.m3u8') ? 'hls' : 'video',
        title: video.title || document.title,
        event: 'play'
      };
      
      if (videoData.url) {
        chrome.runtime.sendMessage({
          cmd: "VIDEO_EVENT",
          parameter: videoData
        }).catch(() => {});
      }
    }
  });
  
  document.addEventListener('loadedmetadata', (event) => {
    if (event.target.tagName === 'VIDEO') {
      const video = event.target;
      const videoUrl = video.src || video.currentSrc;
      if (((video.duration && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 10) || isManifestUrl(videoUrl)) && !isSegmentUrl(videoUrl)) {
        const videoData = {
          url: videoUrl,
          type: isManifestUrl(videoUrl) ? (videoUrl.endsWith('.m3u8') ? 'hls' : 'dash') : 'video',
          title: video.title || document.title,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          event: 'loadedmetadata'
        };
        chrome.runtime.sendMessage({
          cmd: "VIDEO_DETECTED",
          parameter: videoData
        }).catch(() => {});
      }
    }
  });

  document.addEventListener('durationchange', (event) => {
    if (event.target.tagName === 'VIDEO') {
      const video = event.target;
      const videoUrl = video.src || video.currentSrc;
      if (((video.duration && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 10) || isManifestUrl(videoUrl)) && !isSegmentUrl(videoUrl)) {
        const videoData = {
          url: videoUrl,
          type: isManifestUrl(videoUrl) ? (videoUrl.endsWith('.m3u8') ? 'hls' : 'dash') : 'video',
          title: video.title || document.title,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          event: 'durationchange'
        };
        chrome.runtime.sendMessage({
          cmd: "VIDEO_DETECTED",
          parameter: videoData
        }).catch(() => {});
      }
    }
  });

  document.addEventListener('loadeddata', (event) => {
    if (event.target.tagName === 'VIDEO') {
      const video = event.target;
      const videoUrl = video.src || video.currentSrc;
      if (((video.duration && isFinite(video.duration) && !isNaN(video.duration) && video.duration > 10) || isManifestUrl(videoUrl)) && !isSegmentUrl(videoUrl)) {
        const videoData = {
          url: videoUrl,
          type: isManifestUrl(videoUrl) ? (videoUrl.endsWith('.m3u8') ? 'hls' : 'dash') : 'video',
          title: video.title || document.title,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          event: 'loadeddata'
        };
        chrome.runtime.sendMessage({
          cmd: "VIDEO_DETECTED",
          parameter: videoData
        }).catch(() => {});
      }
    }
  });
};

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Also detect immediately for already loaded videos
detectVideos(); 