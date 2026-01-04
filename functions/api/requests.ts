// functions/api/requests.ts
import type { PagesFunction } from "@cloudflare/workers-types";

function normalizeRow(r: any) {
  // try multiple possible column names
  const trackId = r.track_id ?? r.trackId ?? r.id ?? r.spotify_id ?? null;
  const title = r.title ?? r.name ?? r.track_title ?? null;
  const artist = r.artist ?? r.artist_name ?? r.artists ?? null;

  const votes = Number(r.votes ?? r.vote_count ?? 0);
  const requestedCount = Number(r.requested_count ?? r.request_count ?? r.count ?? 1);

  const albumArt = r.album_art ?? r.albumArt ?? r.image ?? r.art_url ?? null;

  return { trackId, title, artist, albumArt, votes, requestedCount, _raw: r };
}

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(`SELECT * FROM requests`).all();
    const normalized = (results ?? []).map(normalizeRow);

    // Sort by votes, then requestedCount
    normalized.sort((a, b) => (b.votes - a.votes) || (b.requestedCount - a.requestedCount));

    return new Response(JSON.stringify(normalized), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};

