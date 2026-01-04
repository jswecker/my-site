import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  const limitRaw = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 10;

  // Optional: filter out old stuff
  // const sinceDays = Number(url.searchParams.get("sinceDays") ?? "7");

  const { results } = await env.DB
    .prepare(
      `
      SELECT
        id,
        created_at,
        votes,
        track_id,
        track_name,
        artist_name,
        album_name,
        artwork_url,
        track_time_ms,
        requested_by
      FROM requests
      ORDER BY votes DESC, created_at DESC
      LIMIT ?1
      `
    )
    .bind(limit)
    .all();

  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
};

