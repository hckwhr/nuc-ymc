import unittest
from server.test_security import SecurityTests
from server.content import FIELDS

class ContentTests(unittest.TestCase):
    setUp = SecurityTests.setUp
    tearDown = SecurityTests.tearDown
    new_client = SecurityTests.new_client
    login = SecurityTests.login
    register = SecurityTests.register

    def test_publication_permissions_conflict_and_audit(self):
        original = self.client.get('/api/site-content').json()
        self.assertEqual(original['revision'], 0)
        student = self.register(self.client, 'student1')
        self.assertEqual(self.client.put('/api/admin/site-content', json=original).status_code, 403)
        owner = self.new_client(); self.login(owner, 'hck', 'Owner-password-123')
        body = {'revision': 0, 'values': {**original['values'], 'announcement_title':'新公告', 'announcement_body':'<script>纯文本</script>'}}
        self.assertEqual(owner.put('/api/admin/site-content', json=body, headers={'X-CSRF-Token':'bad'}).status_code, 403)
        result = owner.put('/api/admin/site-content', json=body)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['revision'], 1)
        self.assertEqual(self.client.get('/api/site-content').json()['values']['announcement_title'], '新公告')
        self.assertEqual(owner.put('/api/admin/site-content', json=body).status_code, 409)
        self.assertEqual(owner.put('/api/admin/site-content', json=result.json()).json()['revision'], 1)
        audit = owner.get('/api/admin/audit').json()['items'][0]
        self.assertEqual(audit['action'], 'site_content')
        self.assertIn('before', audit['detail']); self.assertIn('after', audit['detail'])
        owner.patch('/api/admin/users/'+student['id']+'/role', json={'role':'admin','department':'design'})
        self.login(self.client,'student1','User-password-123')
        self.assertEqual(self.client.put('/api/admin/site-content', json=result.json()).status_code,403)
        owner.close()

    def test_validation_and_unpublishing(self):
        self.login(self.client,'hck','Owner-password-123')
        body = self.client.get('/api/site-content').json()
        for values in [{}, {**body['values'],'extra':'x'}, {**body['values'],'center_intro':''}, {**body['values'],'announcement_title':'孤立标题'}, {**body['values'],'department_design':'x'*501}]:
            self.assertEqual(self.client.put('/api/admin/site-content',json={'revision':0,'values':values}).status_code,422)
        body['values'].update(announcement_title='通知',announcement_body='内容')
        body=self.client.put('/api/admin/site-content',json=body).json()
        body['values'].update(announcement_title='',announcement_body='')
        result=self.client.put('/api/admin/site-content',json=body)
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.json()['values']['announcement_title'],'')
