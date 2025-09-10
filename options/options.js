const q = document.getElementById("quality");
const gen = document.getElementById("genThumbs");
const liveSel = document.getElementById("hlsLiveMinutes");

chrome.storage.sync.get(["hlsQuality","genThumbs","hlsLiveMinutes"], (st) => {
  q.value = st.hlsQuality || "best";
  gen.checked = st.genThumbs !== false;
  liveSel.value = String(st.hlsLiveMinutes || 60);
});
q.onchange = () => chrome.storage.sync.set({ hlsQuality: q.value });
gen.onchange = () => chrome.storage.sync.set({ genThumbs: gen.checked });
liveSel.onchange = () => chrome.storage.sync.set({ hlsLiveMinutes: parseInt(liveSel.value, 10) });
