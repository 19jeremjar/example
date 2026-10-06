// GET /api/playlist?list=PLAYLIST_ID → { id, title, videos: [{ youtubeId, title }] }
// Reads a public YouTube playlist page server-side (no API key needed).
// Used to refresh the folders in js/mixtapes.js.

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function textOf(t) {
  if (!t) return "";
  if (typeof t === "string") return t;
  if (t.simpleText) return t.simpleText;
  if (t.content) return t.content;
  if (Array.isArray(t.runs)) return t.runs.map((r) => r.text).join("");
  return "";
}

function walk(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return; }
  if (node.playlistVideoRenderer && node.playlistVideoRenderer.videoId) {
    const r = node.playlistVideoRenderer;
    out.videos.push({ youtubeId: r.videoId, title: textOf(r.title), playable: r.isPlayable !== false });
  }
  // Newer page layout: "lockup" view models.
  if (node.lockupViewModel && node.lockupViewModel.contentId) {
    const l = node.lockupViewModel;
    const t = l.metadata && l.metadata.lockupMetadataViewModel && l.metadata.lockupMetadataViewModel.title;
    if (/^[A-Za-z0-9_-]{11}$/.test(l.contentId)) out.videos.push({ youtubeId: l.contentId, title: textOf(t), playable: true });
  }
  // Generic fallback: any renderer carrying a videoId and a title.
  if (out.generic && typeof node.videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(node.videoId) && node.title) {
    out.videos.push({ youtubeId: node.videoId, title: textOf(node.title), playable: true });
  }
  if (out.keys) for (const k in node) if (/Renderer$|ViewModel$/.test(k)) out.keys[k] = (out.keys[k] || 0) + 1;
  if (node.continuationItemViewModel && !out.continuation) {
    const tok = JSON.stringify(node.continuationItemViewModel).match(/"token":"([^"]+)"/);
    if (tok) out.continuation = tok[1];
  }
  if (node.continuationItemRenderer) {
    const c = node.continuationItemRenderer;
    const tok = (c.continuationEndpoint && c.continuationEndpoint.continuationCommand && c.continuationEndpoint.continuationCommand.token)
      || (c.continuationEndpoint && c.continuationEndpoint.commandExecutorCommand
        && JSON.stringify(c.continuationEndpoint.commandExecutorCommand).match(/"token":"([^"]+)"/)?.[1]);
    if (tok) out.continuation = tok;
  }
  for (const k in node) if (k !== "playlistVideoRenderer" && k !== "lockupViewModel") walk(node[k], out);
}

module.exports = async (req, res) => {
  const list = String((req.query && req.query.list) || "");
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(list)) {
    res.status(400).json({ error: "Pass ?list=PLAYLIST_ID" });
    return;
  }
  try {
    const page = await fetch(`https://www.youtube.com/playlist?list=${list}&hl=en&gl=US`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" },
    });
    const html = await page.text();
    const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s) || html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);
    if (!m) throw new Error(`no ytInitialData (status ${page.status})`);
    const data = JSON.parse(m[1]);
    const debug = req.query && req.query.debug;
    const out = { videos: [], continuation: null, keys: debug ? {} : null };
    walk(data, out);
    if (!out.videos.length) { out.generic = true; walk(data, out); }

    const title = textOf(data?.metadata?.playlistMetadataRenderer?.title ? { simpleText: data.metadata.playlistMetadataRenderer.title } : data?.header?.playlistHeaderRenderer?.title);
    const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || "2.20240101.00.00";

    // Follow "load more" pages for long playlists.
    for (let i = 0; out.continuation && key && i < 20; i++) {
      const token = out.continuation;
      out.continuation = null;
      const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } }, continuation: token }),
      });
      const json = await r.json();
      if (debug) out.pages = (out.pages || 0) + 1;
      walk(json, out);
    }

    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    // De-duplicate while keeping order.
    const seen = new Set();
    const videos = out.videos.filter((v) => !seen.has(v.youtubeId) && seen.add(v.youtubeId));
    res.status(200).json({ id: list, title, count: videos.length, videos, ...(debug ? { keys: out.keys, len: html.length, pages: out.pages || 0, hasKey: !!key } : {}) });
  } catch (err) {
    res.status(502).json({ error: String(err && err.message || err) });
  }
};
