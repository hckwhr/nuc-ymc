import unittest
from server.test_security import SecurityTests

class AdminDashboardTests(unittest.TestCase):
    setUp = SecurityTests.setUp
    tearDown = SecurityTests.tearDown
    new_client = SecurityTests.new_client
    login = SecurityTests.login
    register = SecurityTests.register

    def test_detail_permissions_scope_and_fresh_role(self):
        student = self.register(self.client, 'member1')
        path = '/api/admin/users/' + student['id']
        self.assertEqual(self.client.get(path).status_code, 403)
        anonymous = self.new_client()
        self.assertEqual(anonymous.get(path).status_code, 401)
        owner = self.new_client(); self.login(owner, 'hck', 'Owner-password-123')
        detail = owner.get(path).json()
        self.assertEqual(detail['username'], 'member1')
        self.assertEqual(detail['work_count'], 0)
        self.assertEqual(detail['study_count'], 0)
        self.assertNotIn('password_hash', detail)
        self.assertNotIn('csrf', detail)
        self.assertEqual(owner.get('/api/admin/users/missing').status_code, 404)
        owner.patch(path + '/role', json={'role': 'admin', 'department': 'design'})
        self.assertEqual(owner.get(path).json()['department'], 'design')
        self.login(self.client, 'member1', 'User-password-123')
        self.assertEqual(self.client.get(path).status_code, 403)
        overview = self.client.get('/api/admin/overview').json()
        self.assertIsNone(overview['logins'])
        self.assertNotIn('study_pending', overview)
        owner.patch(path + '/role', json={'role': 'admin'})
        self.login(self.client, 'member1', 'User-password-123')
        self.assertEqual(self.client.get(path).status_code, 200)
        self.assertIsNone(owner.get(path).json()['department'])
        self.assertEqual(self.client.patch('/api/admin/users/owner-id/role', json={'role':'user'}).status_code,403)
        anonymous.close(); owner.close()
