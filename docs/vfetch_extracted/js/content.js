
(() => {
  const detectedVideos = new Set();

  function reportVideo(url) {
    if (!url || detectedVideos.has(url)) return;
    detectedVideos.add(url);
    chrome.runtime.sendMessage({ cmd: "VIDEO_FOUND", parameter: { url } });
  }

  function scanVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
      if (video.src) reportVideo(video.src);
      const sources = video.querySelectorAll("source");
      sources.forEach(src => {
        if (src.src) reportVideo(src.src);
      });
    });
  }

  const observer = new MutationObserver(() => scanVideos());
  observer.observe(document.body, { childList: true, subtree: true });

  scanVideos();

  document.addEventListener("play", e => {
    const el = e.target;
    if (el.tagName === "VIDEO" && el.src) reportVideo(el.src);
  }, true);
})();
