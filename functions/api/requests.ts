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

  // iTunes Search API is ~20 calls/min (subject to change) :contentReference[oaicite:4]{index=4}
  const it = new URL("https://itunes.apple.com/search");
  it.searchParams.set("term", q);
  it.searchParams.set("entity", "song");
  it.searchParams.set("limit", "10");

  const r = await fetch(it.toString(), { headers: { "User-Agent": "party-jukebox/1.0" } });
  if (!r.ok) return Response.json({ error: "itunes_failed" }, { status: 502 });

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
  await env.DB
    .prepare("INSERT OR REPLACE INTO search_cache (q, fetched_at, response_json) VALUES (?1, ?2, ?3)")
    .bind(q, now, body)
    .run();

  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};

