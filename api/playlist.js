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
  if (node.continuationItemRenderer) {
    const c = node.continuationItemRenderer;
    const tok = (c.continuationEndpoint && c.continuationEndpoint.continuationCommand && c.continuationEndpoint.continuationCommand.token)
      || (c.continuationEndpoint && c.continuationEndpoint.commandExecutorCommand
        && JSON.stringify(c.continuationEndpoint.commandExecutorCommand).match(/"token":"([^"]+)"/)?.[1]);
    if (tok) out.continuation = tok;
  }
  for (const k in node) if (k !== "playlistVideoRenderer") walk(node[k], out);
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
    const out = { videos: [], continuation: null };
    walk(data, out);

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
      walk(await r.json(), out);
    }

    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({ id: list, title, count: out.videos.length, videos: out.videos });
  } catch (err) {
    res.status(502).json({ error: String(err && err.message || err) });
  }
};
