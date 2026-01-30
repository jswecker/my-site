import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, error: "Missing D1 binding DB" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await env.DB.prepare(
      `UPDATE requests SET votes = votes + 1 WHERE id = ?`
    ).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
