// functions/api/request.ts
import type { PagesFunction } from "@cloudflare/workers-types";

function getClientIp(req: Request): string | null {
  // Cloudflare provides this reliably
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf;

  // Fallback (may contain multiple IPs)
  const xff = req.headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();

  return null;
}

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

  // ---- Rate limit: 1 request per client IP per minute ----
  const ip = getClientIp(request);
  if (ip) {
    const now = Date.now();

    const row = await env.DB.prepare(
      `SELECT last_request_ms FROM request_rate_limit WHERE ip = ?`
    )
      .bind(ip)
      .first<{ last_request_ms: number }>();

    if (row && now - row.last_request_ms < 1_000) {
      const waitMs = 60_000 - (now - row.last_request_ms);
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limited", retryAfterMs: waitMs }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            // seconds is standard for Retry-After
            "Retry-After": String(Math.ceil(waitMs / 1000)),
          },
        }
      );
    }

    // Record/update last request timestamp for this IP
    await env.DB.prepare(
      `
      INSERT INTO request_rate_limit (ip, last_request_ms)
      VALUES (?, ?)
      ON CONFLICT(ip) DO UPDATE SET last_request_ms = excluded.last_request_ms
      `
    )
      .bind(ip, now)
      .run();
  }
  // --------------------------------------------------------

  const albumName = body?.collectionName ?? null;
  const artworkUrl = body?.artworkUrl100 ?? null;
  const trackTimeMs = body?.trackTimeMillis ?? null;
  const requestedBy = body?.requestedBy ?? "";

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
      1, 1,
      ?, ?, ?, ?, ?, ?,
      ?
    )
    ON CONFLICT(track_id) DO UPDATE SET
      request_count = request_count + 1,
      votes = votes + 1,
      track_name = excluded.track_name,
      artist_name = excluded.artist_name,
      album_name = excluded.album_name,
      artwork_url = excluded.artwork_url,
      track_time_ms = excluded.track_time_ms,
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

