import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { id } = await request.json().catch(() => ({ id: null }));
  if (!id) return Response.json({ error: "bad_request" }, { status: 400 });

  await env.DB.prepare("UPDATE requests SET votes = votes + 1 WHERE id = ?1").bind(id).run();
  const row = await env.DB.prepare("SELECT votes FROM requests WHERE id = ?1").bind(id).first<{ votes: number }>();

  return Response.json({ ok: true, votes: row?.votes ?? 0 });
};

