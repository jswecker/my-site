import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ ok: true, where: "pages-functions", time: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } }
  );
};

