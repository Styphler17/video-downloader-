// separate simple recorder injected by background if needed
(async function () {
  if (window.__tabRecorderInjected) return;
  window.__tabRecorderInjected = true;
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const rec = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    rec.start();
    setTimeout(() => rec.stop(), 30 * 60 * 1000);
  } catch (e) {
    console.warn(e);
  }
})();
