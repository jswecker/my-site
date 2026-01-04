import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  try {
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

    // Return the rows as-is (snake_case keys like track_name/artist_name)
    return new Response(JSON.stringify({ ok: true, results: results ?? [] }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

