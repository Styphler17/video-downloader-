
class VFetchRecorder {
  constructor(tabId) {
    this.tabId = tabId;
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.channel = new BroadcastChannel(`vfetch-channel-${tabId}`);
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
          const blobURL = URL.createObjectURL(e.data);
          this.channel.postMessage({ blobURL, type: e.data.type });
        }
      };
      this.recorder.onstop = () => this.save();
      this.recorder.start(1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }

  stop() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
  }

  save() {
    const blob = new Blob(this.chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: "vfetch_recording.webm" });
    this.cleanup();
  }

  cleanup() {
    this.chunks = [];
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.recorder = null;
    this.channel.close();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "START_RECORDING") {
    const recorder = new VFetchRecorder(msg.parameter.tabId);
    recorder.start();
    sendResponse({ status: "started" });
    return true;
  }
});
