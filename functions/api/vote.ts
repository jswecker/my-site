// functions/api/vote.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ env, request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.trackId) return new Response("Missing trackId", { status: 400 });

  await env.DB.prepare(
    `UPDATE requests SET votes = votes + 1, updated_at = datetime('now') WHERE track_id = ?`
  )
    .bind(String(body.trackId))
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};

