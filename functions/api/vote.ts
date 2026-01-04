// functions/api/vote.ts
import type { PagesFunction } from "@cloudflare/workers-types";

function pickVoteTarget(body: any) {
  const trackId =
    body?.trackId ??
    body?.track_id ??
    body?.track_id_int ??
    null;

  const id =
    body?.id ?? null;

  return {
    trackId: trackId != null ? Number(trackId) : null,
    id: id != null ? String(id) : null,
  };
}

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ env, request }) => {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: false, error: "Missing D1 binding DB" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await request.json().catch(() => null);
    const { trackId, id } = pickVoteTarget(body);

    if (trackId == null && !id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing trackId or id", got: body }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Prefer trackId if present (most reliable)
    let res;
    if (trackId != null) {
      res = await env.DB.prepare(
        `UPDATE requests SET votes = votes + 1, updated_at = datetime('now') WHERE track_id = ?`
      ).bind(trackId).run();
    } else {
      res = await env.DB.prepare(
        `UPDATE requests SET votes = votes + 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(id!).run();
    }

    return new Response(JSON.stringify({ ok: true, changes: res.meta?.changes ?? 0 }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

