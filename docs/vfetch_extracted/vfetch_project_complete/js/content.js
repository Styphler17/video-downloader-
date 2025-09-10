// AnyVideo Content Script - Advanced Video Detection
const { version } = chrome.runtime.getManifest();
document.body.setAttribute("data-version", version);

let broadcastChannel = null;
let recordingIndicator = null;

// Initialize recording system
const initializeRecording = async () => {
  const { queue } = await new Promise((resolve) => {
    chrome.storage.local.get(["queue"], resolve);
  });
  
  if (!queue) return;
  
  const { currentTabId, tabsCount } = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ cmd: "GET_TAB_ID", parameter: {} }, resolve);
  });
  
  queue.tabId = currentTabId;
  queue.tabsCount = tabsCount;
  queue.version = Number(version);
  
  broadcastChannel = new BroadcastChannel(`channel-${currentTabId}`);
  
  broadcastChannel.addEventListener("message", (event) => {
    const { id, cmd, data, response } = event.data;
    
    if (cmd === "GET_ALL_STORAGE") {
      const { storageKey } = data;
      chrome.storage.local.get([storageKey], (result) => {
        if (Object.keys(result).length !== 0) {
          result = result[storageKey];
        }
        if (response) {
          broadcastChannel.postMessage({ id, data: result });
        }
      });
    } else if (cmd === "BG_FETCH") {
      chrome.runtime.sendMessage({ cmd, parameter: data }, (result) => {
        if (result.ok && result.blobURL) {
          fetch(result.blobURL)
            .then((response) => {
              if (response.ok) return response.blob();
              broadcastChannel.postMessage({ 
                id, 
                data: { ok: false, statusText: `Fetch Error-${response.status}` } 
              });
            })
            .then((blob) => {
              broadcastChannel.postMessage({ 
                id, 
                data: { ok: true, content: blob } 
              });
            })
            .catch((error) => {
              broadcastChannel.postMessage({ 
                id, 
                data: { ok: false, statusText: error.name } 
              });
            })
            .finally(() => {
              URL.revokeObjectURL(result.blobURL);
            });
        } else {
          broadcastChannel.postMessage({ id, data: result });
        }
      });
    } else {
      chrome.runtime.sendMessage({ cmd, parameter: data }, (result) => {
        if (response) {
          broadcastChannel.postMessage({ id, data: result });
        }
      });
    }
  });
  
  window.addEventListener("beforeunload", () => {
    if (broadcastChannel) {
      broadcastChannel.close();
    }
  });
  
  chrome.storage.local.remove(["queue"]);
  
  // Handle temporary channel
  new BroadcastChannel("fetchv-temporary-channel").postMessage(
    queue ? JSON.stringify(queue) : queue
  );
  
  if (queue) {
    if (queue.type !== "rec") {
      chrome.storage.local.get(["tasks"], ({ tasks }) => {
        if (!tasks) tasks = [];
        tasks.push({ tabId: queue.tabId, url: queue.url });
        chrome.storage.local.set({ tasks });
      });
    } else {
      let isRecording = false;
      
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const { cmd, parameter } = message;
        
        if (cmd === "REC_ON_DATA") {
          const { data } = parameter;
          if (data.url) {
            fetch(data.url)
              .then(response => response.blob())
              .then(blob => {
                URL.revokeObjectURL(data.url);
                data.content = blob;
                if (broadcastChannel) {
                  broadcastChannel.postMessage({ id: cmd, data });
                }
              });
          } else {
            if (broadcastChannel) {
              broadcastChannel.postMessage({ id: cmd, data });
            }
          }
          
          if (!isRecording) {
            isRecording = true;
          }
          
          sendResponse();
          return true;
        }
        
        if (cmd === "REC_STOP") {
          isRecording = false;
          if (broadcastChannel) {
            broadcastChannel.postMessage({ id: cmd });
          }
          sendResponse();
          return true;
        }
      });
      
      window.addEventListener("beforeunload", () => {
        if (isRecording) {
          chrome.runtime.sendMessage({ 
            cmd: "REC_STOP", 
            parameter: { tabId: queue.targetTab } 
          });
        }
      });
    }
  }
};

// Initialize recording indicator
const initializeRecordingIndicator = () => {
  let recorderTab = null;
  let broadcastChannel = null;
  let indicator = null;
  
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
    
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("js/hook.js");
    document.documentElement.appendChild(script);
    
    window.addEventListener("beforeunload", () => {
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
};

// Check if video URL exists in document
const checkVideoUrl = (url, baseUrl) => {
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
};

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
      if (recordingIndicator) {
        recordingIndicator.remove();
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
  const videoElements = document.querySelectorAll('video, source[type*="video"], source[src*=".mp4"], source[src*=".webm"], source[src*=".m3u8"], source[type*="mpegurl"], source[type*="application/vnd.apple.mpegurl"]');
  
  videoElements.forEach(video => {
    if (video.tagName === 'VIDEO') {
      const videoUrl = video.src || video.currentSrc;
      const isHLS = videoUrl.includes('.m3u8') || 
                   (video.querySelector('source[src*=".m3u8"]')) ||
                   (video.querySelector('source[type*="mpegurl"]')) ||
                   (video.querySelector('source[type*="application/vnd.apple.mpegurl"]'));
      
      const videoData = {
        url: videoUrl,
        type: isHLS ? 'hls' : 'video',
        title: video.title || document.title,
        duration: video.duration,
        currentTime: video.currentTime,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        playbackRate: video.playbackRate,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error
      };
      
      if (videoData.url) {
        chrome.runtime.sendMessage({
          cmd: "VIDEO_DETECTED",
          parameter: videoData
        }).catch(() => {});
      }
    } else if (video.tagName === 'SOURCE') {
      const isHLS = video.src.includes('.m3u8') || video.type.includes('mpegurl') || video.type.includes('application/vnd.apple.mpegurl');
      const videoData = {
        url: video.src,
        type: isHLS ? 'hls' : (video.type || 'video/mp4'),
        title: document.title
      };
      
      if (videoData.url) {
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
            const videos = node.querySelectorAll('video, source[type*="video"], source[src*=".mp4"], source[src*=".webm"], source[src*=".m3u8"]');
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
  initializeRecording();
  initializeRecordingIndicator();
  
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
      detectVideos();
    }
  }, true);
  
  document.addEventListener('loadeddata', (event) => {
    if (event.target.tagName === 'VIDEO') {
      detectVideos();
    }
  }, true);
  
  document.addEventListener('canplay', (event) => {
    if (event.target.tagName === 'VIDEO') {
      detectVideos();
    }
  }, true);
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}


