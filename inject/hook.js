// Page-context hook to detect MSE usage
(function () {
  try {
    const OriginalMediaSource = window.MediaSource;
    if (!OriginalMediaSource || OriginalMediaSource.__uvdHooked) return;
    OriginalMediaSource.__uvdHooked = true;

    window.MediaSource = new Proxy(OriginalMediaSource, {
      construct(Target, args) {
        const ms = new Target(...args);
        const originalAdd = ms.addSourceBuffer.bind(ms);
        ms.addSourceBuffer = function(mime) {
          try {
            window.postMessage({ __uvd: true, kind: 'mse-detected', mime: String(mime || '') }, '*');
          } catch {}
          const sb = originalAdd(mime);
          const origAppend = sb.appendBuffer.bind(sb);
          sb.appendBuffer = function(buffer) {
            try {
              window.postMessage({ __uvd: true, kind: 'mse-append', size: buffer?.byteLength || 0, mime: String(mime || '') }, '*');
            } catch {}
            return origAppend(buffer);
          };
          return sb;
        };
        return ms;
      }
    });
  } catch (e) {
    // ignore
  }
})();

