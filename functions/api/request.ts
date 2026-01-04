// functions/api/request.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ env, request }) => {
  const body = await request.json().catch(() => null);

  const trackId = body?.trackId;
  const trackName = body?.trackName;
  const artistName = body?.artistName;

  if (trackId == null || !trackName || !artistName) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing trackId/trackName/artistName", got: body }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const albumName = body?.collectionName ?? null;
  const artworkUrl = body?.artworkUrl100 ?? null;
  const trackTimeMs = body?.trackTimeMillis ?? null;
  const requestedBy = body?.requestedBy ?? "";

  // One row per track_id; requesting again increments request_count
  await env.DB.prepare(
    `
    INSERT INTO requests (
      id, created_at, updated_at,
      votes, request_count,
      track_id, track_name, artist_name, album_name, artwork_url, track_time_ms,
      requested_by
    )
    VALUES (
      ?, datetime('now'), datetime('now'),
      0, 1,
      ?, ?, ?, ?, ?, ?,
      ?
    )
    ON CONFLICT(track_id) DO UPDATE SET
      request_count = request_count + 1,
      track_name = excluded.track_name,
      artist_name = excluded.artist_name,
      album_name = excluded.album_name,
      artwork_url = excluded.artwork_url,
      track_time_ms = excluded.track_time_ms,
      -- optionally keep last requester (or leave as-is)
      requested_by = excluded.requested_by,
      updated_at = datetime('now')
    `
  )
    .bind(
      `track:${String(trackId)}`,
      Number(trackId),
      String(trackName),
      String(artistName),
      albumName ? String(albumName) : null,
      artworkUrl ? String(artworkUrl) : null,
      trackTimeMs != null ? Number(trackTimeMs) : null,
      String(requestedBy)
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};

