"""Upload reviewed study inventory to existing OSS. Credentials are never logged.

Run from the workspace root with an OSS2-enabled Python:
  python tools/publish-study.py uploads.json ossutilconfig
"""
import argparse
import configparser
from concurrent.futures import ThreadPoolExecutor
import json
import mimetypes
from pathlib import Path
import time
from urllib.parse import quote
import oss2

parser = argparse.ArgumentParser()
parser.add_argument('inventory', type=Path)
parser.add_argument('config', type=Path)
args = parser.parse_args()
config = configparser.ConfigParser()
config.read(args.config, encoding='utf-8-sig')
credentials = config['Credentials']
auth = oss2.Auth(credentials['accessKeyID'], credentials['accessKeySecret'])

def upload(item):
    bucket = oss2.Bucket(auth, 'https://oss-cn-hongkong.aliyuncs.com', 'nuc-ymc-site', connect_timeout=90)
    path = Path(item['source'])
    key = item['key']
    size = path.stat().st_size
    for attempt in range(4):
        try:
            try:
                head = bucket.head_object(key)
                if head.content_length == size and head.headers.get('x-oss-meta-sha256') == item['sha256']:
                    print(f'Verified existing {key}', flush=True)
                    return
            except oss2.exceptions.NoSuchKey:
                pass
            headers = {
                'Content-Type': mimetypes.guess_type(path.name)[0] or 'application/octet-stream',
                'Cache-Control': 'public,max-age=31536000,immutable',
                'x-oss-meta-sha256': item['sha256'],
            }
            if path.suffix in ('.js', '.mjs'):
                headers['Content-Type'] = 'text/javascript'
            if key.startswith('study-files/'):
                disposition = 'inline' if path.suffix.lower() == '.pdf' else 'attachment'
                headers['Content-Disposition'] = disposition + "; filename*=UTF-8''" + quote(item['name'], safe='')
            result = oss2.resumable_upload(bucket, key, str(path), headers=headers,
                store=oss2.ResumableStore(root=str(args.inventory.parent / 'oss-resume')),
                multipart_threshold=10 * 1024 * 1024, part_size=5 * 1024 * 1024, num_threads=2)
            assert result.status == 200
            head = bucket.head_object(key)
            assert head.content_length == size and head.headers.get('x-oss-meta-sha256') == item['sha256']
            print(f'Uploaded and verified {key} ({size} bytes)', flush=True)
            return
        except Exception as error:
            if attempt == 3:
                raise RuntimeError(f'Upload failed: {key} ({type(error).__name__})') from None
            time.sleep(2 ** attempt)

items = json.loads(args.inventory.read_text(encoding='utf-8'))
with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(upload, items))
print(f'PASS: {len(items)} objects uploaded and verified', flush=True)
