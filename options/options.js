const q = document.getElementById("quality");
const gen = document.getElementById("genThumbs");

chrome.storage.sync.get(["hlsQuality","genThumbs"], (st) => {
  q.value = st.hlsQuality || "best";
  gen.checked = st.genThumbs !== false;
});
q.onchange = () => chrome.storage.sync.set({ hlsQuality: q.value });
gen.onchange = () => chrome.storage.sync.set({ genThumbs: gen.checked });
