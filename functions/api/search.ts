import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = norm(url.searchParams.get("q") ?? "");
  if (q.length < 3) return Response.json({ results: [] });

  const cached = await env.DB
    .prepare("SELECT fetched_at, response_json FROM search_cache WHERE q = ?1")
    .bind(q)
    .first<{ fetched_at: number; response_json: string }>();

  const now = Date.now();
  if (cached && now - cached.fetched_at < TTL_MS) {
    return new Response(cached.response_json, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const it = new URL("https://itunes.apple.com/search");
  it.searchParams.set("term", q);
  it.searchParams.set("entity", "song");
  it.searchParams.set("limit", "10");

  // More browser-like headers can help reduce edge/CDN blocking.
  const itunesHeaders: Record<string, string> = {
    Accept: "application/json,text/javascript,*/*;q=0.1",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  };

  const fetchItunes = () => fetch(it.toString(), { headers: itunesHeaders });

  // Try once, then retry once (helps transient failures / rate limits).
  let r = await fetchItunes();
  if (!r.ok) {
    await new Promise((res) => setTimeout(res, 200));
    r = await fetchItunes();
  }

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.log("itunes_failed", r.status, r.statusText, text.slice(0, 200));

    // Party-friendly: if we have an older cached result, serve it rather than erroring.
    if (cached) {
      return new Response(cached.response_json, {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "itunes_failed",
        status: r.status,
        statusText: r.statusText,
        sample: text.slice(0, 200),
      }),
      { status: 502, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  }

  const data = await r.json();
  const results = (data.results ?? []).map((t: any) => ({
    trackId: t.trackId,
    trackName: t.trackName,
    artistName: t.artistName,
    collectionName: t.collectionName,
    artworkUrl100: t.artworkUrl100,
    trackTimeMillis: t.trackTimeMillis,
  }));

  const body = JSON.stringify({ results });

  // Don't poison cache with empty lists.
  if (results.length > 0) {
    await env.DB
      .prepare("INSERT OR REPLACE INTO search_cache (q, fetched_at, response_json) VALUES (?1, ?2, ?3)")
      .bind(q, now, body)
      .run();
  }

  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
