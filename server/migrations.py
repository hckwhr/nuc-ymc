"""Expand submission departments without discarding existing accounts or works."""
import sqlite3


def migrate_departments(database):
    connection = sqlite3.connect(database, timeout=30)
    try:
        # Foreign keys are disabled only on this connection during the table rebuild.
        connection.execute("PRAGMA foreign_keys=OFF")
        connection.execute("BEGIN IMMEDIATE")
        columns = {row[1] for row in connection.execute("PRAGMA table_info(works)")}
        if "branch" in columns:
            connection.commit()
            return
        connection.execute("""CREATE TABLE works_next (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
            description TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('photography','design','douyin')),
            status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','deleted')),
            reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
            branch TEXT NOT NULL DEFAULT '其他'
        )""")
        connection.execute("INSERT INTO works_next SELECT *, '其他' FROM works")
        connection.execute("DROP TABLE works")
        connection.execute("ALTER TABLE works_next RENAME TO works")
        connection.execute("CREATE INDEX works_user ON works(user_id, created_at)")
        connection.execute("CREATE INDEX works_status ON works(status, created_at)")
        if connection.execute("PRAGMA foreign_key_check").fetchone():
            raise RuntimeError("Department migration failed foreign key validation")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
