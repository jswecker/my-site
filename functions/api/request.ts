// functions/api/request.ts
import type { PagesFunction } from "@cloudflare/workers-types";

function normalizeRequestPayload(body: any) {
  const trackId =
    body?.trackId ??
    body?.track_id ??
    body?.id ??
    null;

  const title =
    body?.title ??
    body?.trackName ??   // ✅ iTunes
    body?.name ??
    null;

  const artist =
    body?.artist ??
    body?.artistName ??  // ✅ iTunes
    body?.artistNameString ??
    (Array.isArray(body?.artists)
      ? body.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
      : null);

  const albumArt =
    body?.albumArt ??
    body?.album_art ??
    body?.artworkUrl100 ?? // ✅ iTunes
    body?.image ??
    (Array.isArray(body?.images) ? body.images?.[0]?.url : null) ??
    null;

  return { trackId, title, artist, albumArt };
}

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ env, request }) => {
  const body = await request.json().catch(() => null);
  const { trackId, title, artist, albumArt } = normalizeRequestPayload(body);

  if (trackId == null || !title || !artist) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing trackId/title/artist", got: body }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // NOTE: DB part will be fixed in Fix 2 (schema-safe)
  // For now just return ok so you can verify payload is good:
  return new Response(JSON.stringify({ ok: true, trackId, title, artist, albumArt }), {
    headers: { "content-type": "application/json" },
  });
};

