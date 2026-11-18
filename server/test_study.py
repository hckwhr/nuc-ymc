import io
from pathlib import Path
import unittest
import zipfile
from unittest.mock import patch

from server.test_security import SecurityTests
from server.study import inspect_document, LIMIT


class StudyTests(unittest.TestCase):
    setUp = SecurityTests.setUp
    tearDown = SecurityTests.tearDown
    new_client = SecurityTests.new_client
    login = SecurityTests.login
    register = SecurityTests.register

    def upload(self, name='notes.pdf', data=b'%PDF-1.7\nexample\n%%EOF'):
        return self.client.post('/api/study/documents', data={'title':'Study notes', 'course':'电路', 'rights':'true'}, files={'file':(name,data)})

    def test_private_moderation_range_revocation_and_audit(self):
        author=self.register(self.client,'student1')
        owner=self.new_client(); self.login(owner,'hck','Owner-password-123')
        outsider=self.new_client(); outsider_user=self.register(outsider,'student2')
        response=self.upload(); self.assertEqual(response.status_code,201,response.text)
        uid=response.json()['id']; route='/api/study/documents/'+uid
        self.assertEqual(self.client.get('/api/study/documents').json()['total'],0)
        self.assertEqual(outsider.get(route).status_code,404)
        self.assertEqual(self.client.get(route).status_code,200)
        self.assertEqual(self.client.get('/api/admin/study').status_code,403)
        self.assertEqual(outsider.delete(route).status_code,404)
        entry=owner.get('/api/admin/study').json()['items'][0]
        self.assertEqual(entry['username'],'student1')
        decision={'status':'approved','revision':entry['updated_at']}
        self.assertEqual(owner.patch('/api/admin/study/'+uid,json=decision).status_code,200)
        public=outsider.get('/api/study/documents').json()['items'][0]
        self.assertNotIn('username',public)
        result=outsider.get(route+'/file',headers={'Range':'bytes=0-3'})
        self.assertEqual(result.status_code,206); self.assertEqual(result.content,b'%PDF')
        self.assertEqual(result.headers['content-range'],'bytes 0-3/22')
        self.assertIn('attachment',result.headers['content-disposition'])
        self.assertIn('Content-Range',result.headers['access-control-expose-headers'])
        self.assertEqual(outsider.get(route+'/file',headers={'Range':'bytes=999-1000'}).status_code,416)
        self.assertEqual(owner.patch('/api/admin/study/'+uid,json=decision).status_code,409)
        owner.patch('/api/admin/users/'+outsider_user['id']+'/role',json={'role':'admin','department':'photography'})
        self.login(outsider,'student2','User-password-123')
        self.assertEqual(outsider.get('/api/admin/study').status_code,403)
        self.assertEqual(outsider.patch('/api/admin/study/'+uid,json={'status':'deleted','reason':'x','revision':public['updated_at']}).status_code,403)
        self.assertEqual(self.client.delete(route,headers={'X-CSRF-Token':'bad'}).status_code,403)
        self.assertEqual(self.client.delete(route).status_code,200)
        self.assertEqual(outsider.get(route+'/file').status_code,404)
        self.assertEqual(self.client.get('/api/my/study').json()['items'][0]['status'],'deleted')
        self.assertTrue(any(e['action']=='study_deleted' for e in owner.get('/api/admin/audit').json()['items']))
        owner.close();outsider.close()

    def test_validation_word_preview_and_upload_failure(self):
        self.register(self.client,'student1')
        for name,data in [('bad.exe',b'abc'),('bad.pdf',b'<script/>'),('bad.zip',b'123'),('bad.rar',b'123'),('bad.doc',b'123'),('bad.docx',b'123')]:
            self.assertEqual(self.upload(name,data).status_code,422)
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>学习笔记 &lt;script&gt;</w:t></w:r></w:p></w:document>')
        result=self.upload('notes.docx',archive.getvalue());self.assertEqual(result.status_code,201,result.text)
        entry=self.client.get('/api/study/documents/'+result.json()['id']).json()
        self.assertEqual(entry['preview_text'],'学习笔记 <script>')
        with patch.object(self.app.state.storage,'put_document',side_effect=RuntimeError('storage failure')):
            self.assertEqual(self.upload().status_code,503)
        with self.app.state.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM obsolete_objects').fetchone()[0],1)
        with self.assertRaises(ValueError): inspect_document('large.pdf',b'x'*(LIMIT+1))

    def test_disabled_author_hidden_and_moderation_reason(self):
        author=self.register(self.client,'student1')
        owner=self.new_client();self.login(owner,'hck','Owner-password-123')
        uid=self.upload().json()['id']
        entry=owner.get('/api/admin/study').json()['items'][0]
        decision={'status':'rejected','revision':entry['updated_at'],'reason':''}
        self.assertEqual(owner.patch('/api/admin/study/'+uid,json=decision).status_code,422)
        decision['reason']='请核对内容'
        self.assertEqual(owner.patch('/api/admin/study/'+uid,json=decision).status_code,200)
        self.assertEqual(self.client.get('/api/my/study').json()['items'][0]['reason'],'请核对内容')
        owner.patch('/api/admin/users/'+author['id']+'/disabled',json={'disabled':True})
        self.assertEqual(owner.get('/api/study/documents/'+uid+'/file').status_code,404)
        owner.close()

if __name__=='__main__': unittest.main()
