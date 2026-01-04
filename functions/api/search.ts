import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Search-Version": "v4",
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const q = norm(url.searchParams.get("q") ?? "");

    if (q.length < 3) {
      return new Response(JSON.stringify({ results: [] }), { headers: BASE_HEADERS });
    }

    const cached = await env.DB
      .prepare("SELECT fetched_at, response_json FROM search_cache WHERE q = ?1")
      .bind(q)
      .first<{ fetched_at: number; response_json: string }>();

    const now = Date.now();
    if (cached && now - cached.fetched_at < TTL_MS) {
      return new Response(cached.response_json, { headers: BASE_HEADERS });
    }

    const it = new URL("https://itunes.apple.com/search");
    it.searchParams.set("term", q);
    it.searchParams.set("entity", "song");
    it.searchParams.set("limit", "10");

    const itunesHeaders: Record<string, string> = {
      Accept: "application/json,text/javascript,*/*;q=0.1",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    };

    const fetchItunes = async () => {
      try {
        return await fetch(it.toString(), { headers: itunesHeaders });
      } catch (e) {
        // Surface fetch throws (DNS/TLS/etc)
        throw new Error(`fetch_throw: ${String(e)}`);
      }
    };

    let r = await fetchItunes();
    if (!r.ok) {
      await new Promise((res) => setTimeout(res, 200));
      r = await fetchItunes();
    }

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return new Response(
        `V4_ITUNES_FAIL status=${r.status} ${r.statusText} sample=${text.slice(0, 120)}`,
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-store",
            "X-Search-Version": "v4",
          },
        }
      );
    }

    // Avoid json() throw: parse text ourselves
    const raw = await r.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return new Response(`V4_BAD_JSON sample=${raw.slice(0, 200)}`, {
        status: 502,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
          "X-Search-Version": "v4",
        },
      });
    }

    const results = (data.results ?? []).map((t: any) => ({
      trackId: t.trackId,
      trackName: t.trackName,
      artistName: t.artistName,
      collectionName: t.collectionName,
      artworkUrl100: t.artworkUrl100,
      trackTimeMillis: t.trackTimeMillis,
    }));

    const body = JSON.stringify({ results });

    if (results.length > 0) {
      await env.DB
        .prepare("INSERT OR REPLACE INTO search_cache (q, fetched_at, response_json) VALUES (?1, ?2, ?3)")
        .bind(q, now, body)
        .run();
    }

    return new Response(body, { headers: BASE_HEADERS });
  } catch (err) {
    // Catch ANY unhandled error so Cloudflare can’t hide it behind “error code: 502”
    return new Response(`V4_UNHANDLED ${String(err)}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
        "X-Search-Version": "v4",
      },
    });
  }
};

