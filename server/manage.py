"""Server-only account setup, password recovery and daily maintenance."""
import argparse
import os
import secrets
import sqlite3
import time
import uuid
from pathlib import Path

from .app import CONSENT_VERSION, create_app
from .passwords import hash_password
from .settings import Settings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["owner", "reset-password", "maintain"])
    parser.add_argument("--username")
    parser.add_argument("--output")
    args = parser.parse_args()
    settings = Settings.from_env()
    app = create_app(settings)
    moment = int(time.time())
    if args.action in {"owner", "reset-password"}:
        if not args.output:
            parser.error("--output is required for the private credential file")
        password = secrets.token_urlsafe(24)
        username = settings.owner_username if args.action == "owner" else args.username
        if not username:
            parser.error("--username is required")
        # Exclusive file creation prevents accidental replacement of existing credentials.
        with open(args.output, "x", encoding="utf-8") as output:
            os.chmod(args.output, 0o600)
            with app.state.db(write=True) as connection:
                target = connection.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
                if args.action == "owner":
                    if target or connection.execute("SELECT 1 FROM users WHERE role='owner'").fetchone():
                        raise RuntimeError("Owner or username already exists")
                    user_id = str(uuid.uuid4())
                    connection.execute("INSERT INTO users(id,username,password_hash,must_change_password,nickname,role,created_at,consent_version) "
                                       "VALUES(?,?,?,1,?,'owner',?,?)", (user_id, username, hash_password(password), "网站管理员", moment, CONSENT_VERSION))
                else:
                    if not target:
                        raise RuntimeError("User does not exist")
                    user_id = target["id"]
                    connection.execute("UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?", (hash_password(password), user_id))
                    connection.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
                connection.execute("INSERT INTO audit(actor_id,action,target_id,detail,created_at) VALUES(NULL,?,?,?,?)",
                                   ("bootstrap" if args.action == "owner" else "reset_password", user_id, "服务器命令行操作", moment))
                output.write(f"登录地址：https://api.nuc-ymc.com/account\n用户名：{username}\n初始密码：{password}\n首次登录必须修改密码。请妥善保管此文件。\n")
        print("Account prepared; credentials written to the private output file.")
        return

    with app.state.db() as connection:
        images = connection.execute("SELECT i.id,i.object_key FROM images i JOIN works w ON w.id=i.work_id WHERE w.status='deleted' AND i.purged=0").fetchall()
    for image in images:
        app.state.storage.delete(image["object_key"])
        with app.state.db(write=True) as connection:
            connection.execute("UPDATE images SET purged=1 WHERE id=?", (image["id"],))
    with app.state.db() as connection:
        obsolete = connection.execute("SELECT object_key FROM obsolete_objects").fetchall()
    for item in obsolete:
        app.state.storage.delete(item["object_key"])
        with app.state.db(write=True) as connection:
            connection.execute("DELETE FROM obsolete_objects WHERE object_key=?", (item["object_key"],))
    cutoff = moment - settings.log_days * 86400
    with app.state.db() as connection:
        documents = connection.execute("SELECT id,object_key FROM study_documents WHERE status='deleted' AND purged=0").fetchall()
    for document in documents:
        app.state.storage.delete(document['object_key'])
        with app.state.db(write=True) as connection:
            connection.execute("UPDATE study_documents SET purged=1,preview_text='' WHERE id=?", (document['id'],))
    with app.state.db(write=True) as connection:
        connection.execute("DELETE FROM sessions WHERE expires<=?", (moment,))
        connection.execute("DELETE FROM limits WHERE resets<=?", (moment,))
        connection.execute("DELETE FROM login_events WHERE created_at<?", (cutoff,))
        connection.execute("DELETE FROM audit WHERE created_at<?", (cutoff,))
        connection.execute("DELETE FROM notifications WHERE created_at<?", (cutoff,))
        connection.execute("DELETE FROM images WHERE purged=1 AND work_id IN (SELECT id FROM works WHERE status='deleted' AND updated_at<?)", (cutoff,))
        connection.execute("DELETE FROM works WHERE status='deleted' AND updated_at<? AND NOT EXISTS(SELECT 1 FROM images WHERE work_id=works.id)", (cutoff,))
    backups = settings.data_dir / "backups"
    backups.mkdir(exist_ok=True)
    destination = backups / (time.strftime("%Y-%m-%d") + ".sqlite3")
    with app.state.db() as connection, sqlite3.connect(destination) as backup:
        connection.backup(backup)
    os.chmod(destination, 0o600)
    for path in backups.glob("*.sqlite3"):
        if path.stat().st_mtime < moment - 7 * 86400:
            path.unlink()
    # Private off-host backup in the same configured OSS account.
    if settings.storage == "oss":
        slot = time.localtime().tm_wday
        app.state.storage.bucket.put_object(f"community-backups/database-{slot}.sqlite3", destination.read_bytes(),
                                          headers={"x-oss-object-acl": "private", "Content-Type": "application/octet-stream"})
    print("Maintenance and database backup completed.")


if __name__ == "__main__":
    main()
