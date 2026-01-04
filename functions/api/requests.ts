// functions/api/requests.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `
    SELECT
      track_id      AS trackId,
      track_name    AS trackName,
      artist_name   AS artistName,
      album_name    AS albumName,
      artwork_url   AS artworkUrl,
      track_time_ms AS trackTimeMillis,
      votes,
      request_count AS requestCount,
      updated_at    AS updatedAt
    FROM requests
    ORDER BY votes DESC, request_count DESC, updated_at DESC
    `
  ).all();

  return new Response(JSON.stringify(results ?? []), {
    headers: { "content-type": "application/json" },
  });
};

