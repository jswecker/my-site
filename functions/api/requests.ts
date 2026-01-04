// functions/api/requests.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `
    SELECT track_id AS trackId,
           title,
           artist,
           album_art AS albumArt,
           requested_count AS requestedCount,
           votes
    FROM requests
    ORDER BY votes DESC, requested_count DESC, updated_at DESC
    `
  ).all();

  return new Response(JSON.stringify(results ?? []), {
    headers: { "content-type": "application/json" },
  });
};

