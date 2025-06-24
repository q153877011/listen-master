DROP TABLE IF EXISTS audio;

CREATE TABLE IF NOT EXISTS audio (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT,
    audio BLOB NOT NULL CHECK(length(audio) > 0),
    miss_text TEXT,
    chinese TEXT,
    original_text TEXT,
    answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 