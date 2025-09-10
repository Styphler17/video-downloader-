const q = document.getElementById("quality");
chrome.storage.sync.get(["hlsQuality"], ({ hlsQuality }) => {
  q.value = hlsQuality || "best";
});
q.onchange = () => chrome.storage.sync.set({ hlsQuality: q.value });
