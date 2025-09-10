(() => {
  let recordingStopped = false;
  let recorderTab = localStorage.getItem("fv_recorder_tab");
  if (!recorderTab) return;
  recorderTab = parseInt(recorderTab);
  const channel = new BroadcastChannel(`channel-${recorderTab}`);
  function randomId(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  channel.addEventListener("message", (event) => {
    if (event.data && event.data.cmd === "REC_STOP") recordingStopped = true;
  });
  const NativeMediaSource = window.MediaSource;
  window.MediaSource = new Proxy(NativeMediaSource, {
    construct(Target, args) {
      const sessionId = randomId(1000, 2e8);
      const ms = new Target(...args);
      let isLive = false;
      ms.addEventListener("sourceended", () => {
        if (!recordingStopped) {
          setTimeout(() => {
            channel.postMessage({ url: null, mid: sessionId, live: isLive });
          }, 5000);
        }
      });
      ms.addSourceBuffer = new Proxy(ms.addSourceBuffer, {
        apply(target, thisArg, argArray) {
          const bufferId = randomId(1000, 2e8);
          const mime = argArray[0];
          const sb = target.apply(thisArg, argArray);
          sb.appendBuffer = new Proxy(sb.appendBuffer, {
            apply(target2, thisArg2, argArray2) {
              if (!recordingStopped && argArray2.length > 0) {
                const buf = argArray2[0];
                if (buf.length > 0 || buf.byteLength > 0) {
                  const blob = new Blob([buf]);
                  const url = URL.createObjectURL(blob);
                  isLive = ms.duration === Infinity;
                  channel.postMessage({ url, mime, mid: sessionId, bid: bufferId, live: isLive });
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                  }, 10000);
                }
              }
              return target2.apply(thisArg2, argArray2);
            }
          });
          return sb;
        }
      });
      return ms;
    }
  });
  // Prevent seeking during the first 10 seconds (to match extracted logic)
  const nativeCurrentTime = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
  let seekTimeout = null, seekBlock = false, seekReady = false;
  setTimeout(() => { seekReady = true; }, 10000);
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    get: function() { return nativeCurrentTime.get.call(this); },
    set: function(val) {
      if (!seekReady) {
        if (seekBlock) {
          if (seekTimeout !== null) {
            val = 0;
          }
        } else {
          val = 0;
          seekBlock = true;
          seekTimeout = setTimeout(() => { seekTimeout = null; }, 1000);
        }
      }
      return nativeCurrentTime.set.call(this, val);
    }
  });
})(); 