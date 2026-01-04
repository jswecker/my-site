import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  try {
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

    return new Response(JSON.stringify(results ?? []), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};

