// functions/api/debug-schema.ts
import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  try {
    const tables = await env.DB.prepare(
      `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`
    ).all();

    const cols = await env.DB.prepare(
      `PRAGMA table_info('requests')`
    ).all();

    const sample = await env.DB.prepare(
      `SELECT * FROM requests LIMIT 5`
    ).all();

    return new Response(JSON.stringify({ tables: tables.results, requestsColumns: cols.results, sample: sample.results }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

