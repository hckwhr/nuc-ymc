"""Private document submissions with the existing session, CSRF and audit checks."""
import asyncio
import io
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import quote
import uuid
import zipfile
from xml.etree import ElementTree

from fastapi import Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from starlette.responses import StreamingResponse

LIMIT = 40 * 1024 * 1024
COURSES = ['大学物理（上）', '大学物理（下）', '大学物理实验', '复变函数', '概率论', '电路', '模拟电子技术', '数字电子技术', '高频电子线路', '传感器', '电磁场与电磁波', '信号与系统', '数字信号处理', '通信原理', '计算机组成原理', '微机原理', 'Python 与数据结构', '马克思主义基本原理', '习近平思想', '党课', '其他课程']


def inspect_document(filename, data):
    suffix = Path(filename).suffix.lower()[1:]
    if not data or len(data) > LIMIT:
        raise ValueError('每份资料须为非空文件，且不超过 40 MB')
    text = ''
    if suffix == 'pdf':
        if not data.startswith(b'%PDF-') or b'%%EOF' not in data[-4096:]:
            raise ValueError('PDF 文件无效或不完整')
    elif suffix == 'docx':
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                info = archive.getinfo('word/document.xml')
                if info.file_size > 4 * 1024 * 1024 or len(archive.infolist()) > 10000:
                    raise ValueError('Word 内容过大，请转为 PDF 后上传')
                xml = archive.read(info)
                if b'<!DOCTYPE' in xml or b'<!ENTITY' in xml:
                    raise ValueError('Word 内容格式不支持')
                root = ElementTree.fromstring(xml)
                ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
                text = '\n'.join(''.join(p.itertext()) for p in root.iter(ns + 'p'))
        except (KeyError, zipfile.BadZipFile, ElementTree.ParseError, RuntimeError):
            raise ValueError('DOCX 文件无效，请重新保存或转为 PDF') from None
    elif suffix == 'doc':
        if not data.startswith(bytes.fromhex('d0cf11e0a1b11ae1')):
            raise ValueError('DOC 文件无效，请转为 PDF 或 DOCX')
        try:
            with tempfile.TemporaryDirectory(prefix='study-word-') as directory:
                source = Path(directory) / 'source.doc'
                source.write_bytes(data)
                output = Path(directory) / 'preview.txt'
                with output.open('wb') as stream:
                    result = subprocess.run(['prlimit', '--as=268435456', '--cpu=15', '--fsize=4194304', '--', 'antiword', '-m', 'UTF-8.txt', str(source)], stdout=stream, stderr=subprocess.DEVNULL, timeout=20)
                if result.returncode or output.stat().st_size > 4 * 1024 * 1024:
                    raise ValueError('此 DOC 无法生成预览，请转为 PDF 或 DOCX')
                text = output.read_text(encoding='utf-8', errors='replace')
        except (FileNotFoundError, subprocess.TimeoutExpired):
            raise ValueError('此 DOC 暂时无法预览，请转为 PDF 或 DOCX 后上传') from None
    elif suffix == 'zip':
        if not zipfile.is_zipfile(io.BytesIO(data)):
            raise ValueError('ZIP 文件无效')
    elif suffix == 'rar':
        if not data.startswith((b'Rar!\x1a\x07\x00', b'Rar!\x1a\x07\x01\x00')):
            raise ValueError('RAR 文件无效')
    else:
        raise ValueError('仅支持 PDF、DOC、DOCX、ZIP、RAR')
    if suffix in ('doc', 'docx') and not text.strip():
        raise ValueError('该 Word 没有可提取文字，请转为 PDF 以保留图片和公式')
    return suffix, text[:500000]


class Decision(BaseModel):
    status: str = Field(pattern='^(approved|rejected|deleted)$')
    reason: str = Field(default='', max_length=500)
    revision: int


def register_study(app, db, storage, current_user, full_administrator, audit, limited, now):
    lock = asyncio.Lock()

    def serialize(row, private=False):
        result = {key: row[key] for key in ('id', 'title', 'description', 'course', 'filename', 'format', 'size', 'status', 'reason', 'created_at', 'updated_at', 'nickname')}
        if private:
            result.update(user_id=row['user_id'], username=row['username'])
        return result

    def listing(page, course, q, where, values, private=False):
        if not 1 <= page <= 100000 or len(q) > 100 or (course and course not in COURSES):
            raise HTTPException(422, '查询条件无效')
        if course:
            where += ' AND d.course=?'; values.append(course)
        if q.strip():
            term = '%' + q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
            where += " AND (d.title LIKE ? ESCAPE '\\' OR d.filename LIKE ? ESCAPE '\\' OR u.nickname LIKE ? ESCAPE '\\')"
            values += [term, term, term]
        with db() as connection:
            total = connection.execute('SELECT COUNT(*) FROM study_documents d JOIN users u ON u.id=d.user_id WHERE ' + where, values).fetchone()[0]
            rows = connection.execute('SELECT d.*,u.nickname,u.username FROM study_documents d JOIN users u ON u.id=d.user_id WHERE ' + where + ' ORDER BY d.created_at DESC,d.id LIMIT 24 OFFSET ?', (*values, (page-1)*24)).fetchall()
        return {'items': [serialize(row, private) for row in rows], 'total': total, 'page': page}

    @app.get('/api/study/courses')
    def courses(): return COURSES

    @app.get('/api/study/documents')
    def public_documents(page: int = 1, course: str = '', q: str = ''):
        return listing(page, course, q, "d.status='approved' AND u.disabled=0", [])

    @app.get('/api/my/study')
    def my_documents(page: int = 1, user=Depends(current_user)):
        return listing(page, '', '', 'd.user_id=?', [user['id']], True)

    @app.get('/api/admin/study')
    def admin_documents(page: int = 1, status: str = '', q: str = '', user=Depends(full_administrator)):
        if status not in ('', 'pending', 'approved', 'rejected', 'deleted'):
            raise HTTPException(422, '状态无效')
        return listing(page, '', q, 'd.status=?' if status else '1=1', [status] if status else [], True)

    @app.post('/api/study/documents', status_code=201)
    async def submit(title: str = Form(min_length=1, max_length=100), course: str = Form(),
                     description: str = Form(default='', max_length=2000), rights: bool = Form(),
                     file: UploadFile = File(), user=Depends(current_user)):
        if not title.strip() or course not in COURSES or not rights:
            raise HTTPException(422, '请填写标题、课程并确认分享权限')
        with db(write=True) as connection:
            blocked = limited(connection, 'study-upload:' + user['id'], 10, 86400)
        if blocked: raise HTTPException(429, '每日最多提交 10 份学习资料')
        async with lock:
            try:
                data = await file.read(LIMIT + 1)
                name = (file.filename or 'document').replace('\\', '/').split('/')[-1]
                name = ''.join(c for c in name if ord(c) >= 32 and ord(c) != 127)[:180]
                suffix, text = await run_in_threadpool(inspect_document, name, data)
            except ValueError as error:
                raise HTTPException(422, str(error)) from None
            finally:
                await file.close()
            uid = str(uuid.uuid4()); key = f'study-submissions/{uid}.{suffix}'
            def save():
                try:
                    with db(write=True) as connection:
                        active = connection.execute('SELECT disabled FROM users WHERE id=?', (user['id'],)).fetchone()
                        if not active or active['disabled']: raise HTTPException(403, '账号不可用')
                        count, size = connection.execute("SELECT COUNT(*),COALESCE(SUM(size),0) FROM study_documents WHERE user_id=? AND status!='deleted'", (user['id'],)).fetchone()
                        if count >= 100 or size + len(data) > 200 * 1024 * 1024:
                            raise HTTPException(409, '每人最多保留 100 份、共 200 MB 学习资料')
                        storage.put_document(key, data)
                        connection.execute("INSERT INTO study_documents(id,user_id,title,description,course,filename,format,object_key,size,preview_text,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'pending',?,?)", (uid,user['id'],title.strip(),description.strip(),course,name,suffix,key,len(data),text,now(),now()))
                        audit(connection,user['id'],'study_upload',uid,title.strip() + ' · ' + course)
                except Exception:
                    with db(write=True) as connection:
                        connection.execute('INSERT OR IGNORE INTO obsolete_objects VALUES(?,?)', (key,now()))
                    raise
            try: await run_in_threadpool(save)
            except HTTPException: raise
            except Exception: raise HTTPException(503, '上传暂未完成，请稍后重试') from None
        return {'id':uid}

    def accessible(uid, request):
        with db() as connection:
            row = connection.execute('SELECT d.*,u.disabled,u.nickname,u.username FROM study_documents d JOIN users u ON u.id=d.user_id WHERE d.id=?', (uid,)).fetchone()
        if not row or row['status']=='deleted' or row['purged'] or row['disabled']:
            raise HTTPException(404, '资料不存在或已下架')
        if row['status'] != 'approved':
            user = current_user(request)
            if user['id'] != row['user_id'] and not (user['role']=='owner' or (user['role']=='admin' and not user['department'])):
                raise HTTPException(404, '资料不存在或尚未公开')
        return row

    @app.get('/api/study/documents/{uid}')
    def detail(uid: str, request: Request):
        row = accessible(uid, request)
        return {**serialize(row), 'preview_text': row['preview_text']}

    @app.get('/api/study/documents/{uid}/file')
    def download(uid: str, request: Request):
        row = accessible(uid, request)
        size=row['size']; start=0; end=size-1
        range_header=request.headers.get('range')
        if range_header:
            match=re.fullmatch(r'bytes=(\d+)-(\d*)',range_header)
            if not match: return Response(status_code=416,headers={'Content-Range':f'bytes */{size}'})
            start=int(match[1]); end=min(int(match[2]) if match[2] else end,end)
            if start>end: return Response(status_code=416,headers={'Content-Range':f'bytes */{size}'})
        headers={'Accept-Ranges':'bytes','Content-Length':str(end-start+1), 'Content-Disposition':"attachment; filename*=UTF-8''"+quote(row['filename'],safe='')}
        if range_header: headers['Content-Range']=f'bytes {start}-{end}/{size}'
        def chunks():
            for offset in range(start,end+1,256*1024):
                yield storage.document_range(row['object_key'],offset,min(end,offset+256*1024-1))
        return StreamingResponse(chunks(),status_code=206 if range_header else 200,headers=headers,media_type='application/pdf' if row['format']=='pdf' else 'application/octet-stream')

    @app.delete('/api/study/documents/{uid}')
    def remove(uid: str, user=Depends(current_user)):
        with db(write=True) as connection:
            row=connection.execute('SELECT * FROM study_documents WHERE id=? AND user_id=?',(uid,user['id'])).fetchone()
            if not row: raise HTTPException(404,'资料不存在')
            connection.execute("UPDATE study_documents SET status='deleted',updated_at=MAX(updated_at+1,?) WHERE id=?",(now(),uid))
            audit(connection,user['id'],'study_deleted',uid,row['title'])
        return {'ok':True}

    @app.patch('/api/admin/study/{uid}')
    def moderate(uid: str, body: Decision, user=Depends(full_administrator)):
        if body.status != 'approved' and not body.reason.strip(): raise HTTPException(422,'请填写处理原因')
        with db(write=True) as connection:
            row=connection.execute('SELECT * FROM study_documents WHERE id=?',(uid,)).fetchone()
            if not row: raise HTTPException(404,'资料不存在')
            if row['status']=='deleted' or row['updated_at']!=body.revision: raise HTTPException(409,'资料已被处理，请刷新')
            connection.execute('UPDATE study_documents SET status=?,reason=?,updated_at=MAX(updated_at+1,?) WHERE id=?',(body.status,body.reason.strip(),now(),uid))
            connection.execute('INSERT INTO notifications(user_id,work_id,title,status,reason,created_at) VALUES(?,?,?,?,?,?)', (row['user_id'],uid,row['title'],'study_'+body.status,body.reason.strip(),now()))
            audit(connection,user['id'],'study_'+body.status,uid,row['title']+' · '+body.reason.strip())
        return {'ok':True}
