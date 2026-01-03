CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,

  track_id INTEGER NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  artwork_url TEXT,
  track_time_ms INTEGER,

  requested_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_sort
  ON requests(votes DESC, created_at DESC);

-- Cache iTunes search results so you don't hit their ~20/min cap :contentReference[oaicite:1]{index=1}
CREATE TABLE IF NOT EXISTS search_cache (
  q TEXT PRIMARY KEY,
  fetched_at INTEGER NOT NULL,
  response_json TEXT NOT NULL
);

