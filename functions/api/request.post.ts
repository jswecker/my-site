import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, error: "Missing D1 binding DB" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { trackId, trackName, artistName, collectionName, artworkUrl100, trackTimeMillis } = body;

    if (!trackId || !trackName || !artistName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await env.DB.prepare(
      `INSERT INTO requests (track_id, track_name, artist_name, album_name, artwork_url, track_time_ms, request_count, votes)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0)
       ON CONFLICT(track_id) DO UPDATE SET request_count = request_count + 1`
    ).bind(trackId, trackName, artistName, collectionName || null, artworkUrl100 || null, trackTimeMillis || 0).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
