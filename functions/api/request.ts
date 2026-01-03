import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const p = await request.json().catch(() => null);
  if (!p?.trackId || !p?.trackName || !p?.artistName) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  await env.DB.prepare(`
    INSERT INTO requests
      (id, created_at, votes, track_id, track_name, artist_name, album_name, artwork_url, track_time_ms, requested_by)
    VALUES
      (?1, ?2, 0, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
  `).bind(
    crypto.randomUUID(),
    new Date().toISOString(),
    p.trackId,
    p.trackName,
    p.artistName,
    p.collectionName ?? null,
    p.artworkUrl100 ?? null,
    p.trackTimeMillis ?? null,
    p.requestedBy ?? null
  ).run();

  return Response.json({ ok: true });
};

