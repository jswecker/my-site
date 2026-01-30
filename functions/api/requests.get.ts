import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, error: "Missing D1 binding DB" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const { results } = await env.DB.prepare(
    `
    SELECT *
    FROM requests
    ORDER BY votes DESC, request_count DESC, updated_at DESC
    `
  ).all();

  const rows = (results ?? []).map((r: any) => ({
    // keep original DB fields (snake_case) so existing UI keeps working
    ...r,

    // add common aliases so *any* component can find them
    trackId: r.track_id,
    trackName: r.track_name,
    artistName: r.artist_name,
    collectionName: r.album_name,
    artworkUrl100: r.artwork_url,
    trackTimeMillis: r.track_time_ms,
    requestCount: r.request_count,

    // common “generic” names some UIs use
    title: r.track_name,
    artist: r.artist_name,
  }));

  return new Response(JSON.stringify({ ok: true, results: rows }), {
    headers: { "content-type": "application/json" },
  });
};