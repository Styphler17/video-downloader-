
(() => {
  const tabId = parseInt(localStorage.getItem("vfetch_recorder_tab") || "0");
  if (!tabId) return;

  const channel = new BroadcastChannel(`vfetch-channel-${tabId}`);

  const OriginalMediaSource = window.MediaSource;
  window.MediaSource = new Proxy(OriginalMediaSource, {
    construct(Target, args) {
      const instance = new Target(...args);

      instance.addSourceBuffer = new Proxy(instance.addSourceBuffer, {
        apply(addSB, thisArg, sbArgs) {
          const sourceBuffer = addSB.apply(thisArg, sbArgs);
          const originalAppend = sourceBuffer.appendBuffer;

          sourceBuffer.appendBuffer = function(buffer) {
            const blob = new Blob([buffer]);
            const url = URL.createObjectURL(blob);
            channel.postMessage({ blobURL: url, mime: sbArgs[0] });
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            return originalAppend.call(this, buffer);
          };

          return sourceBuffer;
        }
      });

      return instance;
    }
  });
})();
