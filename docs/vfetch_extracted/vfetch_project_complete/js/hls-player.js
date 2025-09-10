// AnyVideo HLS Player Loader
(function(){
  if (window.Hls) return;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('js/hls.min.js');
  script.onload = function() {
    if (window.Hls) window.Hls.isSupported = window.Hls.isSupported || (() => true);
  };
  document.head.appendChild(script);
})(); 