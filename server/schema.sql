PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 0, nickname TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('owner','admin','user')), disabled INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, last_login INTEGER, consent_version TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_owner ON users(role) WHERE role='owner';
CREATE TABLE IF NOT EXISTS sessions (
 digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 expires INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS limits (scope TEXT PRIMARY KEY, hits INTEGER NOT NULL, resets INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT REFERENCES users(id), username TEXT NOT NULL,
 success INTEGER NOT NULL, reason TEXT NOT NULL, ip_hash TEXT NOT NULL, device TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS works (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
 description TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('photography','design')),
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','deleted')),
 reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS images (
 id TEXT PRIMARY KEY, work_id TEXT NOT NULL REFERENCES works(id), object_key TEXT NOT NULL UNIQUE,
 position INTEGER NOT NULL, size INTEGER NOT NULL, purged INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL,
 target_id TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS works_user ON works(user_id, created_at);
CREATE INDEX IF NOT EXISTS works_status ON works(status, created_at);
CREATE INDEX IF NOT EXISTS logins_user ON login_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_date ON audit(created_at);
