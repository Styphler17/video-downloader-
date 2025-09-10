
const VFetchVideoUtils = {
  getVideoType(url) {
    if (!url) return "unknown";
    const u = url.toLowerCase();
    if (u.includes(".m3u8")) return "hls";
    if (u.includes(".mp4")) return "mp4";
    if (u.includes(".webm")) return "webm";
    if (u.startsWith("blob:")) return "blob";
    return "unknown";
  },

  isDownloadable(url) {
    const type = this.getVideoType(url);
    return ["mp4", "webm"].includes(type);
  },

  extractFilename(url) {
    try {
      const u = new URL(url);
      return u.pathname.split("/").pop() || "video";
    } catch (e) {
      return "video";
    }
  }
};
