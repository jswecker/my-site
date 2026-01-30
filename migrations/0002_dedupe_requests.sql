PRAGMA foreign_keys=OFF;

-- Add columns that may not exist in the original schema (0001)
ALTER TABLE requests ADD COLUMN track_name TEXT;
ALTER TABLE requests ADD COLUMN artist_name TEXT;
ALTER TABLE requests ADD COLUMN album_name TEXT;
ALTER TABLE requests ADD COLUMN artwork_url TEXT;
ALTER TABLE requests ADD COLUMN track_time_ms INTEGER;
ALTER TABLE requests ADD COLUMN requested_by TEXT;

CREATE TABLE requests_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  votes INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 1,

  track_id INTEGER NOT NULL UNIQUE,
  track_name TEXT,        -- allow NULL for old rows
  artist_name TEXT,       -- allow NULL for old rows
  album_name TEXT,
  artwork_url TEXT,
  track_time_ms INTEGER,
  requested_by TEXT
);

INSERT INTO requests_new (
  id, created_at, updated_at, votes, request_count,
  track_id, track_name, artist_name, album_name, artwork_url, track_time_ms, requested_by
)
SELECT
  'track:' || CAST(track_id AS TEXT) AS id,
  MAX(created_at) AS created_at,
  MAX(created_at) AS updated_at,
  SUM(votes) AS votes,
  COUNT(*) AS request_count,
  track_id,
  MAX(track_name) AS track_name,
  MAX(artist_name) AS artist_name,
  MAX(album_name) AS album_name,
  MAX(artwork_url) AS artwork_url,
  MAX(track_time_ms) AS track_time_ms,
  MAX(requested_by) AS requested_by
FROM requests
GROUP BY track_id;

DROP TABLE requests;
ALTER TABLE requests_new RENAME TO requests;

PRAGMA foreign_keys=ON;
