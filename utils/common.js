export function isVideoLikeUrl(url) {
  return /\.(mp4|webm|m4v|mov|ts)(\?|#|$)/i.test(url);
}

export function isHls(url, ct = "") {
  return /\.m3u8(\?|#|$)/i.test(url) || /mpegurl/i.test(ct);
}

export function isDash(url, ct = "") {
  return /\.mpd(\?|#|$)/i.test(url) || /dash\+xml/i.test(ct);
}

export function filenameFromUrl(u, fallback = "video") {
  try {
    const url = new URL(u);
    const base = url.pathname.split("/").pop() || fallback;
    return decodeURIComponent(base.split(/[?#]/)[0]) || fallback;
  } catch {
    return fallback;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
