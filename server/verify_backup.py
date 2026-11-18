"""Read-only recovery drill: download an OSS database backup into a temporary directory.

Never restores into the production database, deletes objects or prints user records.
Run with the same protected environment as the maintenance service.
"""
import argparse
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

from .settings import Settings
from .storage import Storage


def inspect_backup(path, object_exists):
    with closing(sqlite3.connect(f'{Path(path).resolve().as_uri()}?mode=ro', uri=True)) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or db.execute('PRAGMA foreign_key_check').fetchall():
            raise RuntimeError('Backup failed database integrity checks')
        counts = {table: db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0] for table in ('users', 'works', 'images')}
        images = db.execute("SELECT i.object_key FROM images i JOIN works w ON w.id=i.work_id WHERE i.purged=0 AND w.status!='deleted'").fetchall()
    missing = sum(not object_exists(key) for (key,) in images)
    return {**counts, 'referenced_images': len(images), 'missing_images': missing}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--slot', type=int, choices=range(7), required=True)
    args = parser.parse_args()
    settings = Settings.from_env(); settings.validate()
    if settings.storage != 'oss':
        parser.error('The production recovery drill requires OSS')
    storage = Storage(settings)
    key = f'community-backups/database-{args.slot}.sqlite3'
    with tempfile.TemporaryDirectory(prefix='ymc-backup-drill-') as directory:
        path = Path(directory) / 'restored.sqlite3'
        storage.bucket.get_object_to_file(key, str(path))
        result = inspect_backup(path, storage.bucket.object_exists)
        result['slot'] = args.slot
        result['database_acl'] = storage.bucket.get_object_acl(key).acl
        print(json.dumps(result))
        if result['missing_images'] or result['database_acl'] != 'private':
            raise SystemExit('Backup is incomplete or not private; production data was not changed')


if __name__ == '__main__':
    main()
