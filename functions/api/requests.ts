import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const sort = url.searchParams.get("sort") ?? "top"; // top | recent

  const orderBy =
    sort === "recent"
      ? "created_at DESC"
      : "votes DESC, created_at DESC";

  const { results } = await env.DB
    .prepare(
      `SELECT id, created_at, votes, track_id, track_name, artist_name, album_name, artwork_url, track_time_ms, requested_by
       FROM requests
       ORDER BY ${orderBy}
       LIMIT ?1`
    )
    .bind(limit)
    .all();

  return Response.json(
    { results },
    { headers: { "Cache-Control": "no-store" } }
  );
};

