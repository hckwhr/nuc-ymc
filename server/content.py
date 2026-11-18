"""Plain-text site copy, with optimistic concurrency and audited publication."""
import json
from pathlib import Path
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

FIELDS = json.loads(Path(__file__).with_name('content-defaults.json').read_text(encoding='utf-8'))

class ContentUpdate(BaseModel):
    revision: int = Field(ge=0)
    values: dict[str, str]

def register_content(app, db, administrator, audit, now):
    def read(connection):
        row = connection.execute('SELECT * FROM site_content WHERE id=1').fetchone()
        return {'revision': row['revision'] if row else 0, 'values': json.loads(row['body']) if row else {key: field['value'] for key, field in FIELDS.items()}}

    @app.get('/api/site-content')
    def public_content():
        with db() as connection:
            return read(connection)

    @app.put('/api/admin/site-content')
    def publish(body: ContentUpdate, user=Depends(administrator)):
        if set(body.values) != set(FIELDS):
            raise HTTPException(422, '内容字段不匹配，请刷新编辑器')
        values = {key: value.strip() for key, value in body.values.items()}
        for key, value in values.items():
            if len(value) > FIELDS[key]['max'] or any(ord(c) < 32 and c not in '\n\t' for c in value):
                raise HTTPException(422, FIELDS[key]['label'] + '超出长度限制或包含无效字符')
            if not value and key not in ('recruit_contact', 'announcement_title', 'announcement_body'):
                raise HTTPException(422, FIELDS[key]['label'] + '不能为空')
        if bool(values['announcement_title']) != bool(values['announcement_body']):
            raise HTTPException(422, '公告标题和内容请同时填写，或同时清空以隐藏公告')
        with db(write=True) as connection:
            current = read(connection)
            if current['revision'] != body.revision:
                raise HTTPException(409, '其他管理员已更新内容。请复制保留当前修改，再重新加载最新版。')
            changes = {key: {'before': current['values'][key], 'after': value} for key, value in values.items() if current['values'][key] != value}
            if changes:
                revision = current['revision'] + 1
                connection.execute('INSERT OR REPLACE INTO site_content VALUES(1,?,?,?)', (revision, json.dumps(values, ensure_ascii=False), now()))
                audit(connection, user['id'], 'site_content', 'homepage', json.dumps(changes, ensure_ascii=False))
            return read(connection)
