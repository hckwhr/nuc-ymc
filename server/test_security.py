import io
import tempfile
import sqlite3
import unittest
import json
from unittest.mock import patch
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from server.app import CONSENT_VERSION, create_app
from server.passwords import hash_password
from server.settings import Settings
from server.migrations import migrate_departments


class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = create_app(Settings(environment="test", data_dir=Path(self.temp.name), secret="x" * 40,
                                       storage="local", origins=("https://site.test",)))
        self.client = self.new_client()
        with self.app.state.db(write=True) as db:
            db.execute("INSERT INTO users(id,username,password_hash,nickname,role,created_at,consent_version) VALUES(?,?,?,?,?,1,?)",
                       ("owner-id", "hck", hash_password("Owner-password-123"), "Owner", "owner", CONSENT_VERSION))

    def tearDown(self):
        self.client.close()
        self.temp.cleanup()

    def new_client(self):
        return TestClient(self.app, headers={"Origin": "https://site.test"})

    def login(self, client, username, password):
        response = client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        client.headers["X-CSRF-Token"] = response.json()["csrf"]
        return response.json()["user"]

    def register(self, client, username):
        response = client.post("/api/auth/register", json={"username": username, "password": "User-password-123", "consent": CONSENT_VERSION, "role": "owner"})
        self.assertEqual(response.status_code, 201, response.text)
        client.headers["X-CSRF-Token"] = response.json()["csrf"]
        return response.json()["user"]

    def test_roles_private_upload_moderation_and_revocation(self):
        owner = self.new_client()
        self.login(owner, "hck", "Owner-password-123")
        user = self.register(self.client, "creator1")
        self.assertEqual(user["role"], "user")
        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/admin/users/{user['id']}/role", json={"role": "admin"}).status_code, 403)
        image = io.BytesIO()
        Image.new("RGB", (40, 40), "red").save(image, "PNG")
        data = {"title": "Test work", "category": "photography", "rights": "true"}
        invalid = self.client.post("/api/works", data=data, files={"files": ("bad.png", b"<script>alert(1)</script>", "image/png")})
        self.assertEqual(invalid.status_code, 422)
        response = self.client.post("/api/works", data=data, files={"files": ("test.png", image.getvalue(), "image/png")})
        self.assertEqual(response.status_code, 201, response.text)
        work = self.client.get("/api/my/works").json()["items"][0]
        outsider = self.new_client()
        self.register(outsider, "creator2")
        self.assertEqual(outsider.get('/api/images/' + work['images'][0]).status_code, 404)
        self.assertEqual(outsider.delete('/api/works/' + work['id']).status_code, 404)
        self.assertEqual(owner.patch('/api/admin/works/' + work['id'], json={"status": "approved"}).status_code, 200)
        public = outsider.get('/api/works').json()['items'][0]
        self.assertNotIn('username', public)
        self.assertEqual(outsider.get('/api/images/' + work['images'][0]).status_code, 200)
        self.assertEqual(owner.patch(f"/api/admin/users/{user['id']}/role", json={"role": "admin"}).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me').status_code, 401)
        self.login(self.client, 'creator1', 'User-password-123')
        members = self.client.get('/api/admin/users').json()
        self.assertNotIn('password_hash', str(members))
        self.assertEqual(self.client.patch('/api/admin/users/owner-id/role', json={"role": "user"}).status_code, 403)
        self.assertEqual(self.client.patch('/api/admin/works/' + work['id'], json={"status": "deleted", "reason": "测试删除"}).status_code, 200)
        self.assertEqual(outsider.get('/api/images/' + work['images'][0]).status_code, 404)
        self.assertTrue(any(x['action'] == 'deleted' for x in owner.get('/api/admin/audit').json()['items']))
        owner.close(); outsider.close()

    def test_password_csrf_owner_reservation_and_rate_limits(self):
        reserved = self.client.post('/api/auth/register', json={"username": "hck", "password": "User-password-123", "consent": CONSENT_VERSION})
        self.assertEqual(reserved.status_code, 409)
        self.register(self.client, 'creator1')
        self.assertEqual(self.client.patch('/api/profile', json={"nickname": "x"}, headers={"Origin": "https://evil.test"}).status_code, 403)
        self.assertEqual(self.client.patch('/api/profile', json={"nickname": "x"}, headers={"X-CSRF-Token": "bad"}).status_code, 403)
        other = self.new_client()
        self.login(other, 'creator1', 'User-password-123')
        response = self.client.post('/api/auth/password', json={"current_password": "User-password-123", "password": "New-password-456"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(other.get('/api/auth/me').status_code, 401)
        for _ in range(16):
            response = other.post('/api/auth/login', json={"username": "missing_user", "password": "wrong"})
        self.assertEqual(response.status_code, 429)
        other.close()

    def test_initial_password_restricts_owner(self):
        with self.app.state.db(write=True) as db:
            db.execute("UPDATE users SET must_change_password=1 WHERE id='owner-id'")
        self.login(self.client, 'hck', 'Owner-password-123')
        self.assertEqual(self.client.get('/api/admin/users').status_code, 403)
        self.assertEqual(self.client.post('/api/auth/password', json={"current_password": "Owner-password-123", "password": "Owner-new-password-456"}).status_code, 200)
        self.assertEqual(self.client.get('/api/admin/users').status_code, 200)

    def test_department_branches_and_filters(self):
        self.register(self.client, 'creator1')
        picture = io.BytesIO()
        Image.new('RGB', (20, 20), 'blue').save(picture, 'PNG')
        data = {'title': '分镜', 'category': 'douyin', 'branch': '创意短片', 'rights': 'true'}
        response = self.client.post('/api/works', data=data, files={'files': ('frame.png', picture.getvalue(), 'image/png')})
        self.assertEqual(response.status_code, 201, response.text)
        work = self.client.get('/api/my/works').json()['items'][0]
        self.assertEqual(work['branch'], '创意短片')
        owner = self.new_client()
        self.login(owner, 'hck', 'Owner-password-123')
        self.assertEqual(owner.get('/api/admin/works?category=douyin&branch=创意短片').json()['total'], 1)
        self.assertEqual(owner.get('/api/admin/works?category=design').json()['total'], 0)
        owner.patch('/api/admin/works/' + work['id'], json={'status': 'approved'})
        self.assertEqual(self.client.get('/api/works?category=douyin&branch=创意短片').json()['total'], 1)
        data['branch'] = '门票设计'
        response = self.client.post('/api/works', data=data, files={'files': ('frame.png', picture.getvalue(), 'image/png')})
        self.assertEqual(response.status_code, 422)
        owner.close()

    def test_existing_works_migrate_with_images_intact(self):
        path = Path(self.temp.name) / 'old.sqlite3'
        with sqlite3.connect(path) as db:
            db.executescript("""
                CREATE TABLE users(id TEXT PRIMARY KEY);
                INSERT INTO users VALUES('existing-user');
                CREATE TABLE works(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),title TEXT,description TEXT,
                    category TEXT CHECK(category IN ('photography','design')),status TEXT,reason TEXT,created_at INTEGER,updated_at INTEGER);
                INSERT INTO works VALUES('existing-work','existing-user','旧作品','','photography','approved','',1,1);
                CREATE TABLE images(id TEXT PRIMARY KEY,work_id TEXT REFERENCES works(id));
                INSERT INTO images VALUES('existing-image','existing-work');
            """)
        db.close()
        migrate_departments(path)
        migrate_departments(path)
        with sqlite3.connect(path) as db:
            self.assertEqual(db.execute('SELECT title,branch FROM works').fetchone(), ('旧作品', '其他'))
            self.assertEqual(db.execute('SELECT work_id FROM images').fetchone()[0], 'existing-work')
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        db.close()

    def test_edit_resubmit_order_ownership_and_atomic_failure(self):
        author = self.register(self.client, 'creator1')
        owner, visitor = self.new_client(), self.new_client()
        self.login(owner, 'hck', 'Owner-password-123')
        picture = io.BytesIO()
        Image.new('RGB', (20, 20), 'blue').save(picture, 'PNG')
        upload = self.client.post('/api/works', data={'title': '原作品', 'category': 'photography', 'branch': '自然风光', 'rights': 'true'}, files=[('files', ('one.png', picture.getvalue(), 'image/png')), ('files', ('two.png', picture.getvalue(), 'image/png'))])
        self.assertEqual(upload.status_code, 201)
        work_id = upload.json()['id']
        path = '/api/works/' + work_id + '/revision'
        get_path = '/api/my/works/' + work_id
        self.assertEqual(visitor.get(get_path).status_code, 401)
        self.assertEqual(owner.get(get_path).status_code, 404)
        owner.patch('/api/admin/works/' + work_id, json={'status': 'approved'})
        owner.patch('/api/admin/works/' + work_id + '/featured', json={'featured': True})
        old = self.client.get(get_path).json()
        data = {'title': '新作品', 'description': '补充说明', 'category': 'design', 'branch': '海报', 'rights': 'true', 'revision': old['updated_at'], 'order': json.dumps([old['images'][1], old['images'][0]])}
        self.assertEqual(owner.post(path, data=data).status_code, 404)
        self.assertEqual(self.client.post(path, data=data, headers={'X-CSRF-Token': 'bad'}).status_code, 403)
        self.assertEqual(self.client.post(path, data={**data, 'order': '["foreign-image"]'}).status_code, 422)
        self.assertEqual(self.client.post(path, data={**data, 'order': '[]'}).status_code, 422)
        self.assertEqual(self.client.post(path, data={**data, 'order': json.dumps([old['images'][0]] * 2)}).status_code, 422)
        self.assertEqual(self.client.post(path, data=data).status_code, 200)
        edited = self.client.get(get_path).json()
        self.assertEqual(edited['images'], list(reversed(old['images'])))
        self.assertEqual(edited['status'], 'pending')
        self.assertFalse(edited['featured'])
        self.assertEqual(visitor.get('/api/works/' + work_id).status_code, 404)
        self.assertEqual(self.client.post(path, data=data).status_code, 409)
        owner.patch('/api/admin/works/' + work_id, json={'status': 'rejected', 'reason': '请补充图片'})
        rejected = self.client.get(get_path).json()
        data.update(revision=rejected['updated_at'], order=json.dumps(['new:0', old['images'][1]]))
        with patch.object(self.app.state.storage, 'put', side_effect=RuntimeError('simulated storage failure')):
            response = self.client.post(path, data=data, files={'files': ('new.png', picture.getvalue(), 'image/png')})
        self.assertEqual(response.status_code, 503)
        unchanged = self.client.get(get_path).json()
        self.assertEqual(unchanged, rejected)
        self.assertEqual(self.client.post(path, data=data, files={'files': ('bad.png', b'not an image', 'image/png')}).status_code, 422)
        self.assertEqual(self.client.post(path, data=data, files={'files': ('new.png', picture.getvalue(), 'image/png')}).status_code, 200)
        updated = self.client.get(get_path).json()
        self.assertEqual(updated['id'], work_id)
        self.assertEqual(updated['status'], 'pending')
        self.assertEqual(updated['reason'], '')
        self.assertEqual(updated['images'][1], old['images'][1])
        self.assertNotIn(updated['images'][0], old['images'])
        self.assertEqual(self.client.get('/api/images/' + old['images'][0]).status_code, 404)
        with self.app.state.db() as db:
            self.assertGreaterEqual(db.execute('SELECT COUNT(*) FROM obsolete_objects').fetchone()[0], 2)
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        owner.patch('/api/admin/works/' + work_id, json={'status': 'approved'})
        self.assertEqual(visitor.get('/api/works/' + work_id).json()['images'][0], updated['images'][0])
        self.client.delete('/api/works/' + work_id)
        self.assertEqual(self.client.post(path, data={**data, 'revision': updated['updated_at'], 'order': json.dumps(updated['images'])}).status_code, 404)
        owner.close(); visitor.close()

    def test_details_featured_and_private_notifications(self):
        owner, visitor = self.new_client(), self.new_client()
        self.login(owner, 'hck', 'Owner-password-123')
        author = self.register(self.client, 'creator1')
        picture = io.BytesIO()
        Image.new('RGB', (20, 20), 'blue').save(picture, 'PNG')
        response = self.client.post('/api/works', data={'category': 'design', 'branch': '海报', 'title': '校园海报', 'rights': 'true'}, files={'files': ('photo.png', picture.getvalue(), 'image/png')})
        self.assertEqual(response.status_code, 201)
        work_id = response.json()['id']
        detail = '/api/works/' + work_id
        feature = '/api/admin/works/' + work_id + '/featured'
        moderate = '/api/admin/works/' + work_id
        self.assertEqual(visitor.get(detail).status_code, 404)
        self.assertEqual(visitor.get('/api/notifications').status_code, 401)
        self.assertEqual(self.client.patch(feature, json={'featured': True}).status_code, 403)
        self.assertEqual(owner.patch(feature, json={'featured': True}).status_code, 409)
        self.assertEqual(owner.patch(moderate, json={'status': 'approved'}).status_code, 200)
        # Idempotent retries must not produce duplicate unread notifications.
        owner.patch(moderate, json={'status': 'approved'})
        self.assertEqual(self.client.get('/api/notifications/unread').json()['unread'], 1)
        public = visitor.get(detail).json()
        self.assertEqual(public['title'], '校园海报')
        self.assertIsNotNone(public['published_at'])
        for private in ('user_id', 'username', 'reason'):
            self.assertNotIn(private, public)
        self.assertEqual(owner.patch(feature, json={'featured': True}).status_code, 200)
        self.assertTrue(visitor.get(detail).json()['featured'])
        self.assertEqual(visitor.get('/api/works?featured=true').json()['total'], 1)
        notification = self.client.get('/api/notifications').json()['items'][0]
        read = f"/api/notifications/{notification['id']}/read"
        self.assertEqual(owner.get('/api/notifications').json()['total'], 0)
        self.assertEqual(owner.patch(read).status_code, 404)
        self.assertEqual(self.client.patch(read, headers={'X-CSRF-Token': 'bad'}).status_code, 403)
        self.assertEqual(self.client.patch(read).status_code, 200)
        self.assertEqual(self.client.get('/api/notifications/unread').json()['unread'], 0)
        owner.patch('/api/admin/users/' + author['id'] + '/disabled', json={'disabled': True})
        self.assertEqual(visitor.get(detail).status_code, 404)
        self.assertEqual(visitor.get('/api/works?featured=true').json()['total'], 0)
        owner.patch('/api/admin/users/' + author['id'] + '/disabled', json={'disabled': False})
        self.login(self.client, 'creator1', 'User-password-123')
        owner.patch(moderate, json={'status': 'rejected', 'reason': '请补充版权说明'})
        self.assertEqual(visitor.get(detail).status_code, 404)
        self.assertEqual(visitor.get('/api/works?featured=true').json()['total'], 0)
        notices = self.client.get('/api/notifications').json()
        self.assertEqual(notices['total'], 2)
        self.assertEqual(notices['items'][0]['reason'], '请补充版权说明')
        owner.patch(moderate, json={'status': 'approved'})
        self.assertFalse(visitor.get(detail).json()['featured'])
        owner.patch(feature, json={'featured': True})
        owner.patch(moderate, json={'status': 'deleted', 'reason': '清理测试'})
        self.assertEqual(visitor.get(detail).status_code, 404)
        self.assertEqual(self.client.get('/api/notifications').json()['items'][0]['status'], 'deleted')
        with self.app.state.db(write=True) as db:
            for index in range(13):
                db.execute("INSERT INTO works VALUES(?,?,?,'','design','approved','',1,1,'海报')", (f'featured-{index}', author['id'], f'作品{index}'))
        for index in range(12):
            self.assertEqual(owner.patch(f'/api/admin/works/featured-{index}/featured', json={'featured': True}).status_code, 200)
        self.assertEqual(owner.patch('/api/admin/works/featured-12/featured', json={'featured': True}).status_code, 409)
        owner.patch('/api/admin/works/featured-0/featured', json={'featured': False})
        self.assertEqual(owner.patch('/api/admin/works/featured-12/featured', json={'featured': True}).status_code, 200)
        self.assertEqual(self.client.delete('/api/works/featured-12').status_code, 200)
        self.assertEqual(visitor.get('/api/works?featured=true').json()['total'], 11)
        owner.close(); visitor.close()

    def test_dynamic_branches_and_public_visibility(self):
        visitor = self.new_client()
        owner = self.new_client()
        self.login(owner, 'hck', 'Owner-password-123')
        author = self.register(self.client, 'creator1')
        payload = {'category': 'photography', 'name': '毕业季'}
        self.assertEqual(visitor.post('/api/admin/branches', json=payload).status_code, 401)
        self.assertEqual(self.client.post('/api/admin/branches', json=payload).status_code, 403)
        csrf = owner.headers.pop('X-CSRF-Token')
        self.assertEqual(owner.post('/api/admin/branches', json=payload).status_code, 403)
        owner.headers['X-CSRF-Token'] = csrf
        self.assertEqual(owner.post('/api/admin/branches', json=payload).status_code, 201)
        self.assertEqual(owner.post('/api/admin/branches', json=payload).status_code, 409)
        self.assertEqual(owner.post('/api/admin/branches', json={**payload, 'name': '  '}).status_code, 422)
        self.assertEqual(owner.post('/api/admin/branches', json={**payload, 'category': 'invalid'}).status_code, 422)
        self.assertIn('毕业季', visitor.get('/api/categories').json()['photography']['branches'])
        picture = io.BytesIO()
        Image.new('RGB', (20, 20), 'blue').save(picture, 'PNG')
        response = self.client.post('/api/works', data={'category': 'photography', 'branch': '毕业季', 'title': '毕业合影', 'rights': 'true'}, files={'files': ('photo.png', picture.getvalue(), 'image/png')})
        self.assertEqual(response.status_code, 201, response.text)
        work_id = response.json()['id']
        feed = '/api/works?category=photography&branch=毕业季'
        self.assertEqual(visitor.get(feed).json()['total'], 0)
        for status, count in [('approved', 1), ('rejected', 0), ('approved', 1)]:
            self.assertEqual(owner.patch('/api/admin/works/' + work_id, json={'status': status, 'reason': '审核测试'}).status_code, 200)
            self.assertEqual(visitor.get(feed).json()['total'], count)
            self.assertEqual(visitor.get('/api/works').json()['total'], count)
            self.assertEqual(visitor.get('/api/categories').json()['photography']['counts'].get('毕业季', 0), count)
        self.assertNotIn('username', visitor.get(feed).json()['items'][0])
        owner.patch('/api/admin/users/' + author['id'] + '/disabled', json={'disabled': True})
        self.assertEqual(visitor.get(feed).json()['total'], 0)
        owner.patch('/api/admin/users/' + author['id'] + '/disabled', json={'disabled': False})
        owner.patch('/api/admin/works/' + work_id, json={'status': 'deleted', 'reason': '清理'})
        self.assertEqual(visitor.get(feed).json()['total'], 0)
        owner.patch('/api/admin/users/' + author['id'] + '/role', json={'role': 'admin'})
        self.login(self.client, 'creator1', 'User-password-123')
        self.assertEqual(self.client.post('/api/admin/branches', json={'category': 'design', 'name': '校园文创'}).status_code, 201)
        # A fresh app instance reads persisted custom branches rather than resetting to defaults.
        restarted = create_app(Settings(environment='test', data_dir=Path(self.temp.name), secret='x' * 40, storage='local', origins=('https://site.test',)))
        with TestClient(restarted) as client:
            self.assertIn('校园文创', client.get('/api/categories').json()['design']['branches'])
        visitor.close()
        owner.close()


if __name__ == '__main__':
    unittest.main()
