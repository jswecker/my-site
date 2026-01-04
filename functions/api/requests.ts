import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: false, error: "Missing D1 binding DB" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const { results } = await env.DB.prepare(
      `
      SELECT
        track_id        AS trackId,
        track_name      AS trackName,
        artist_name     AS artistName,
        album_name      AS collectionName,
        artwork_url     AS artworkUrl100,
        track_time_ms   AS trackTimeMillis,
        votes           AS votes,
        request_count   AS requestCount,
        updated_at      AS updatedAt
      FROM requests
      ORDER BY votes DESC, request_count DESC, updated_at DESC
      `
    ).all();

    const rows = (results ?? []).map((r: any) => ({
      // original iTunes-ish keys
      ...r,

      // aliases for whatever the UI expects
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      artwork: r.artworkUrl100,

      // some UIs use `count` or `requests`
      count: r.requestCount,
      requests: r.requestCount,
    }));

    return new Response(JSON.stringify({ ok: true, results: rows }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

