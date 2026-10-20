CREATE TABLE IF NOT EXISTS favorites (
  email TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (email, listing_id)
);
