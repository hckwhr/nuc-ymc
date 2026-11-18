import io
import tempfile
import sqlite3
import unittest
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
                       ("owner-id", "hck_admin", hash_password("Owner-password-123"), "Owner", "owner", CONSENT_VERSION))

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
        self.login(owner, "hck_admin", "Owner-password-123")
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
        reserved = self.client.post('/api/auth/register', json={"username": "hck_admin", "password": "User-password-123", "consent": CONSENT_VERSION})
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
        self.login(self.client, 'hck_admin', 'Owner-password-123')
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
        self.login(owner, 'hck_admin', 'Owner-password-123')
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


if __name__ == '__main__':
    unittest.main()
