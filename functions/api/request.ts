// functions/api/request.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestPost: PagesFunction<{
  DB: D1Database;
}> = async (context) => {
  const { DB } = context.env;

  const body = await context.request.json().catch(() => null);
  if (!body?.trackId || !body?.title || !body?.artist) {
    return new Response("Missing trackId/title/artist", { status: 400 });
  }

  const trackId = String(body.trackId);
  const title = String(body.title);
  const artist = String(body.artist);
  const albumArt = body.albumArt ? String(body.albumArt) : null;

  // UPSERT: if track_id exists, increment requested_count (and keep metadata fresh)
  await DB.prepare(
    `
    INSERT INTO requests (track_id, title, artist, album_art, requested_count, votes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))
    ON CONFLICT(track_id) DO UPDATE SET
      requested_count = requested_count + 1,
      title = excluded.title,
      artist = excluded.artist,
      album_art = COALESCE(excluded.album_art, album_art),
      updated_at = datetime('now')
    `
  )
    .bind(trackId, title, artist, albumArt)
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};

