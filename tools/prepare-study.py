"""Inventory originals without changing them; publish manifest only after Word conversion.

Usage: python tools/prepare-study.py SOURCE CACHE [--finalize]
Then run convert-study.ps1 against CACHE/word-jobs.json and repeat with --finalize.
"""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('cache', type=Path)
parser.add_argument('--finalize', action='store_true')
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
names = {'大物上': '大学物理（上）', '大物下': '大学物理（下）', '大物实验': '大学物理实验', '复变': '复变函数', '模电': '模拟电子技术', '数电': '数字电子技术', '信号与系统‘': '信号与系统', 'python与数据结构': 'Python 与数据结构', '马原': '马克思主义基本原理'}
documents, uploads, jobs = [], [], []
for file in sorted(args.source.rglob('*')):
    if not file.is_file() or file.name.startswith('~$'):
        continue
    ext = file.suffix.lower()[1:]
    if ext not in ('pdf', 'doc', 'docx', 'zip', 'rar'):
        raise ValueError(f'Unsupported file: {file.name}')
    relative = file.relative_to(args.source)
    digest = hashlib.file_digest(file.open('rb'), 'sha256').hexdigest()
    uid = hashlib.sha256(relative.as_posix().encode()).hexdigest()[:16]
    key = f'study-files/{uid}/{digest[:16]}.{ext}'
    item = dict(id=uid, name=file.name, course=names.get(relative.parts[0], relative.parts[0]), format=ext, bytes=file.stat().st_size, url='/' + key, preview='')
    uploads.append(dict(source=str(file.resolve()), key=key, sha256=digest, name=file.name))
    if ext == 'pdf':
        item['preview'] = item['url']
    elif ext in ('doc', 'docx'):
        preview = args.cache / (uid + '.pdf')
        jobs.append(dict(source=str(file.resolve()), output=str(preview.resolve())))
        if args.finalize:
            from pypdf import PdfReader
            assert len(PdfReader(preview).pages) > 0
            pdf_hash = hashlib.file_digest(preview.open('rb'), 'sha256').hexdigest()
            pdf_key = f'study-files/{uid}/{pdf_hash[:16]}-preview.pdf'
            item['preview'] = '/' + pdf_key
            uploads.append(dict(source=str(preview.resolve()), key=pdf_key, sha256=pdf_hash, name=file.stem + '.pdf'))
    documents.append(item)
(args.cache / 'word-jobs.json').write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding='utf-8')
if args.finalize:
    (args.cache / 'uploads.json').write_text(json.dumps(uploads, ensure_ascii=False, indent=2), encoding='utf-8')
    target = Path(__file__).resolve().parents[1] / 'src/data/study-files.json'
    target.write_text(json.dumps(documents, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(documents)} originals; {len(jobs)} Word previews; {len(uploads)} upload objects')
