import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Search-Version": "v2",
};

export const onRequestGet: PagesFunction = async () => {
  return new Response("FUNCTION_OK", {
    headers: {
      "Content-Type": "text/plain",
      "X-Search-Version": "v3",
      "Cache-Control": "no-store",
    },
  });
};


