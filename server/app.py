import hashlib
import hmac
import asyncio
import json
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .passwords import hash_password, verify_password
from .migrations import migrate_departments
from .settings import Settings
from .storage import Storage, clean_image
from .study import register_study
from .content import register_content

CONSENT_VERSION = "2026-11-18"
SESSION_SECONDS = 12 * 3600
CATEGORIES = json.loads(Path(__file__).with_name("categories.json").read_text(encoding="utf-8"))
class LoginRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_]{2,31}$")
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(LoginRequest):
    password: str = Field(min_length=12, max_length=128)
    consent: str


class PasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=12, max_length=128)


class ProfileRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=32)


class ModerationRequest(BaseModel):
    status: str = Field(pattern="^(approved|rejected|deleted)$")
    reason: str = Field(default="", max_length=500)
    revision: int | None = None


class RoleRequest(BaseModel):
    role: str = Field(pattern="^(admin|user)$")
    department: str | None = None


class DisableRequest(BaseModel):
    disabled: bool


class BranchRequest(BaseModel):
    category: str
    name: str = Field(min_length=1, max_length=30)


class FeaturedRequest(BaseModel):
    featured: bool


class BranchChangeRequest(BranchRequest):
    target: str = Field(min_length=1, max_length=30)


class BranchOrderRequest(BaseModel):
    category: str
    names: list[str] = Field(min_length=1, max_length=50)


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    settings.validate()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    database = settings.data_dir / "community.sqlite3"
    storage = Storage(settings)

    @contextmanager
    def db(write=False):
        connection = sqlite3.connect(database, timeout=15)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            if write:
                connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    with db() as connection:
        connection.executescript(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
        owner = connection.execute("SELECT username FROM users WHERE role='owner'").fetchone()
        if owner and owner["username"] != settings.owner_username:
            raise ValueError("OWNER_USERNAME differs from the existing owner; use a reviewed account migration")
    migrate_departments(database)
    with db(write=True) as connection:
        if 'position' not in {row['name'] for row in connection.execute('PRAGMA table_info(branches)')}:
            connection.execute('ALTER TABLE branches ADD COLUMN position INTEGER NOT NULL DEFAULT 0')
            for category in CATEGORIES:
                rows = connection.execute('SELECT name FROM branches WHERE category=? ORDER BY created_at,rowid', (category,)).fetchall()
                for position, row in enumerate(rows):
                    connection.execute('UPDATE branches SET position=? WHERE category=? AND name=?', (position, category, row['name']))
        if not connection.execute("SELECT 1 FROM app_migrations WHERE name='branch-seed-v1'").fetchone():
            for category, definition in CATEGORIES.items():
                connection.executemany("INSERT OR IGNORE INTO branches(category,name,created_at,position) VALUES(?,?,0,?)",
                                       [(category, name, index) for index, name in enumerate(definition["branches"])])
            connection.execute("INSERT INTO app_migrations VALUES('branch-seed-v1')")

    app = FastAPI(title="青年媒体中心", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.db = db
    app.state.storage = storage
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins), allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                       allow_headers=["Content-Type", "X-CSRF-Token", "Range"],
                       expose_headers=["Accept-Ranges", "Content-Length", "Content-Range", "Content-Disposition"])
    secure = settings.environment == "production"
    cookie_name = "__Host-ymc_session" if secure else "ymc_session"

    def digest(value):
        return hmac.new(settings.secret.encode(), value.encode(), hashlib.sha256).hexdigest()

    def now():
        return int(time.time())

    def identity(request):
        # Only trust request.client. The deployment proxy explicitly supplies trusted forwarding headers.
        return digest("ip:" + (request.client.host if request.client else "unknown"))

    def audit(connection, actor, action, target, detail=""):
        connection.execute("INSERT INTO audit(actor_id,action,target_id,detail,created_at) VALUES(?,?,?,?,?)",
                           (actor, action, target, detail, now()))

    def limited(connection, key, maximum, seconds):
        moment = now()
        row = connection.execute("SELECT * FROM limits WHERE scope=?", (key,)).fetchone()
        if not row or row["resets"] <= moment:
            connection.execute("INSERT OR REPLACE INTO limits VALUES(?,?,?)", (key, 1, moment + seconds))
            return False
        if row["hits"] >= maximum:
            return True
        connection.execute("UPDATE limits SET hits=hits+1 WHERE scope=?", (key,))
        return False

    def public_user(row):
        result = {key: row[key] for key in ("id", "username", "nickname", "role", "disabled", "created_at", "last_login", "must_change_password")}
        with db() as connection:
            scope = connection.execute('SELECT category FROM admin_departments WHERE user_id=?', (row['id'],)).fetchone()
        result['department'] = scope['category'] if scope and row['role'] == 'admin' else None
        return result

    def current_user(request: Request):
        token = request.cookies.get(cookie_name, "")
        with db() as connection:
            row = connection.execute(
                "SELECT u.*,s.csrf,s.created_at AS session_created,(SELECT category FROM admin_departments WHERE user_id=u.id) AS department FROM sessions s JOIN users u ON u.id=s.user_id "
                "WHERE s.digest=? AND s.expires>? AND u.disabled=0", (digest(token), now())).fetchone()
        if not token or not row:
            raise HTTPException(401, "请先登录")
        if row["must_change_password"] and request.url.path not in {"/api/auth/me", "/api/auth/password", "/api/auth/logout"}:
            raise HTTPException(403, "请先修改初始密码")
        if request.method not in {"GET", "HEAD"}:
            if not hmac.compare_digest(request.headers.get("X-CSRF-Token", ""), row["csrf"]):
                raise HTTPException(403, "安全校验失败，请刷新页面")
        return row

    def administrator(user=Depends(current_user)):
        if user["role"] not in {"owner", "admin"}:
            raise HTTPException(403, "需要管理员权限")
        return user

    def full_administrator(user=Depends(administrator)):
        if user['role'] != 'owner' and user['department']:
            raise HTTPException(403, '部门管理员不能查看全站用户、登录记录或操作审计')
        return user

    def check_department(user, category):
        if user['role'] != 'owner' and user['department'] and user['department'] != category:
            raise HTTPException(403, '只能管理被分配部门的作品与分支')

    def owner(user=Depends(current_user)):
        if user["role"] != "owner":
            raise HTTPException(403, "仅总管理员可操作")
        if now() - user["session_created"] > 1800:
            raise HTTPException(403, "敏感操作需要最近 30 分钟内登录，请退出后重新登录")
        return user

    @app.middleware("http")
    async def security(request: Request, call_next):
        if request.method not in {"GET", "HEAD", "OPTIONS"} and request.headers.get("origin") not in settings.origins:
            return Response("Origin rejected", status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    dummy_hash = hash_password(secrets.token_urlsafe(32))
    register_study(app, db, storage, current_user, full_administrator, audit, limited, now)
    register_content(app, db, full_administrator, audit, now)
    upload_lock = asyncio.Lock()

    @app.get("/api/health")
    def health():
        with db() as connection:
            connection.execute("SELECT 1")
        return {"status": "ok"}

    def valid_branch(category, branch):
        with db() as connection:
            return connection.execute("SELECT 1 FROM branches WHERE category=? AND name=?", (category, branch)).fetchone() is not None

    @app.get("/api/categories")
    def categories():
        with db() as connection:
            result = {key: {"name": value["name"], "branches": [], "counts": {}, "aliases": {}} for key, value in CATEGORIES.items()}
            for row in connection.execute("SELECT category,name FROM branches ORDER BY position,created_at,rowid"):
                result[row["category"]]["branches"].append(row["name"])
            for row in connection.execute('SELECT * FROM branch_aliases'):
                result[row['category']]['aliases'][row['old_name']] = row['name']
            for row in connection.execute("SELECT w.category,w.branch,COUNT(*) AS total FROM works w JOIN users u ON u.id=w.user_id "
                                          "WHERE w.status='approved' AND u.disabled=0 GROUP BY w.category,w.branch"):
                result[row["category"]]["counts"][row["branch"]] = row["total"]
        return result

    @app.post("/api/admin/branches", status_code=201)
    def create_branch(body: BranchRequest, user=Depends(administrator)):
        check_department(user, body.category)
        name = body.name.strip()
        if body.category not in CATEGORIES or not name or any(ord(c) < 32 or ord(c) == 127 for c in name):
            raise HTTPException(422, "请选择部门并填写 1 至 30 个可显示字符的分支名称")
        with db(write=True) as connection:
            if connection.execute("SELECT 1 FROM branches WHERE category=? AND name=?", (body.category, name)).fetchone() or connection.execute('SELECT 1 FROM branch_aliases WHERE category=? AND old_name=?', (body.category, name)).fetchone():
                raise HTTPException(409, "该部门已有同名分支")
            if connection.execute("SELECT COUNT(*) FROM branches WHERE category=?", (body.category,)).fetchone()[0] >= 50:
                raise HTTPException(409, "每个部门最多 50 个分支")
            position = connection.execute('SELECT COALESCE(MAX(position),-1)+1 FROM branches WHERE category=?', (body.category,)).fetchone()[0]
            connection.execute("INSERT INTO branches(category,name,created_at,position) VALUES(?,?,?,?)", (body.category, name, now(), position))
            audit(connection, user["id"], "create_branch", body.category, name)
        return {"category": body.category, "name": name}

    @app.patch('/api/admin/branches/order')
    def order_branches(body: BranchOrderRequest, user=Depends(administrator)):
        check_department(user, body.category)
        if body.category not in CATEGORIES:
            raise HTTPException(422, '无效部门')
        with db(write=True) as connection:
            existing = {row['name'] for row in connection.execute('SELECT name FROM branches WHERE category=?', (body.category,))}
            if len(set(body.names)) != len(body.names) or set(body.names) != existing:
                raise HTTPException(409, '分支列表已变化，请刷新后重新排序')
            connection.executemany('UPDATE branches SET position=? WHERE category=? AND name=?', [(i, body.category, name) for i, name in enumerate(body.names)])
            audit(connection, user['id'], 'branch_order', body.category, json.dumps(body.names, ensure_ascii=False))
        return {'ok': True}

    @app.patch('/api/admin/branches/{action}')
    def change_branch(action: str, body: BranchChangeRequest, user=Depends(administrator)):
        check_department(user, body.category)
        source, target = body.name.strip(), body.target.strip()
        if action not in {'rename', 'merge'} or body.category not in CATEGORIES or not source or not target or source == target or any(ord(c) < 32 or ord(c) == 127 for c in target):
            raise HTTPException(422, '请填写有效且不同的分支名称')
        with db(write=True) as connection:
            old = connection.execute('SELECT * FROM branches WHERE category=? AND name=?', (body.category, source)).fetchone()
            destination = connection.execute('SELECT * FROM branches WHERE category=? AND name=?', (body.category, target)).fetchone()
            if not old:
                raise HTTPException(409, '原分支已变化，请刷新')
            if action == 'merge' and not destination:
                raise HTTPException(422, '请选择同部门已有的目标分支')
            if action == 'rename':
                if destination or connection.execute('SELECT 1 FROM branch_aliases WHERE category=? AND old_name=?', (body.category, target)).fetchone():
                    raise HTTPException(409, '名称已使用或为历史分支名，请换一个名称')
                connection.execute('INSERT INTO branches(category,name,created_at,position) VALUES(?,?,?,?)', (body.category, target, old['created_at'], old['position']))
            count = connection.execute('SELECT COUNT(*) FROM works WHERE category=? AND branch=?', (body.category, source)).fetchone()[0]
            connection.execute('UPDATE works SET branch=?,updated_at=MAX(updated_at+1,?) WHERE category=? AND branch=?', (target, now(), body.category, source))
            connection.execute('UPDATE branch_aliases SET name=? WHERE category=? AND name=?', (target, body.category, source))
            connection.execute('INSERT INTO branch_aliases VALUES(?,?,?)', (body.category, source, target))
            connection.execute('DELETE FROM branches WHERE category=? AND name=?', (body.category, source))
            audit(connection, user['id'], 'branch_' + action, body.category, json.dumps({'from': source, 'to': target, 'works': count}, ensure_ascii=False))
        return {'ok': True, 'works': count}

    def issue_session(connection, user, request, response):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        connection.execute("DELETE FROM sessions WHERE expires<=? OR digest=?", (now(), digest(request.cookies.get(cookie_name, ""))))
        connection.execute("INSERT INTO sessions VALUES(?,?,?,?,?)", (digest(token), user["id"], csrf, now() + SESSION_SECONDS, now()))
        connection.execute("DELETE FROM sessions WHERE user_id=? AND digest NOT IN "
                           "(SELECT digest FROM sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 5)", (user["id"], user["id"]))
        response.set_cookie(cookie_name, token, max_age=SESSION_SECONDS, httponly=True, secure=secure, samesite="lax", path="/")
        return {"user": public_user(user), "csrf": csrf}

    @app.post("/api/auth/register", status_code=201)
    def register(body: RegisterRequest, request: Request, response: Response):
        username = body.username.lower()
        if body.consent != CONSENT_VERSION:
            raise HTTPException(400, "请阅读并同意隐私说明和投稿规则")
        with db(write=True) as connection:
            blocked = any([limited(connection, "register-ip:" + identity(request), 10, 86400),
                           limited(connection, "register-global", 200, 86400)])
        if blocked:
            raise HTTPException(429, "注册请求过于频繁，请稍后重试")
        password_hash = hash_password(body.password)
        with db(write=True) as connection:
            if username == settings.owner_username or connection.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
                raise HTTPException(409, "该用户名不可用，请更换")
            user_id = str(uuid.uuid4())
            connection.execute("INSERT INTO users(id,username,password_hash,nickname,role,created_at,last_login,consent_version) "
                               "VALUES(?,?,?,?,'user',?,?,?)", (user_id, username, password_hash, "创作者" + user_id[:6], now(), now(), CONSENT_VERSION))
            audit(connection, user_id, "register", user_id)
            connection.execute("INSERT INTO login_events(user_id,username,success,reason,ip_hash,device,created_at) VALUES(?,?,1,?,?,?,?)",
                               (user_id, username, "注册成功并登录", identity(request), request.headers.get("user-agent", "")[:300], now()))
            user = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            return issue_session(connection, user, request, response)

    @app.post("/api/auth/login")
    def login(body: LoginRequest, request: Request, response: Response):
        username = body.username.lower()
        with db(write=True) as connection:
            blocked = any([limited(connection, "login-ip:" + identity(request), 40, 900),
                           limited(connection, "login-user:" + username, 15, 900)])
            user = connection.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        if blocked:
            raise HTTPException(429, "登录尝试过多，请 15 分钟后重试")
        verified = verify_password(body.password, user["password_hash"] if user else dummy_hash)
        with db(write=True) as connection:
            current = connection.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
            valid = verified and current and not current["disabled"] and current["password_hash"] == user["password_hash"]
            connection.execute("INSERT INTO login_events(user_id,username,success,reason,ip_hash,device,created_at) VALUES(?,?,?,?,?,?,?)",
                               (current["id"] if current else None, username, int(bool(valid)), "密码登录成功" if valid else "用户名、密码错误或账号不可用",
                                identity(request), request.headers.get("user-agent", "")[:300], now()))
            if valid:
                connection.execute("UPDATE users SET last_login=? WHERE id=?", (now(), current["id"]))
                current = connection.execute("SELECT * FROM users WHERE id=?", (current["id"],)).fetchone()
                result = issue_session(connection, current, request, response)
        if not valid:
            raise HTTPException(401, "用户名、密码错误或账号不可用")
        return result

    @app.post("/api/auth/password")
    def password(body: PasswordRequest, request: Request, response: Response, user=Depends(current_user)):
        with db(write=True) as connection:
            blocked = limited(connection, "password:" + user["id"], 10, 900)
        if blocked:
            raise HTTPException(429, "尝试次数过多，请稍后再试")
        if not verify_password(body.current_password, user["password_hash"]):
            raise HTTPException(400, "当前密码不正确")
        if body.current_password == body.password:
            raise HTTPException(400, "新密码须与当前密码不同")
        hashed = hash_password(body.password)
        with db(write=True) as connection:
            fresh = connection.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
            if fresh["disabled"] or fresh["password_hash"] != user["password_hash"]:
                raise HTTPException(401, "账号状态已改变，请重新登录")
            connection.execute("UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?", (hashed, user["id"]))
            connection.execute("DELETE FROM sessions WHERE user_id=?", (user["id"],))
            audit(connection, user["id"], "password", user["id"])
            fresh = connection.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
            return issue_session(connection, fresh, request, response)

    @app.get("/api/auth/me")
    def me(user=Depends(current_user)):
        return {"user": public_user(user), "csrf": user["csrf"]}

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response, user=Depends(current_user)):
        with db(write=True) as connection:
            connection.execute("DELETE FROM sessions WHERE digest=?", (digest(request.cookies[cookie_name]),))
            audit(connection, user["id"], "logout", user["id"])
        response.delete_cookie(cookie_name, path="/", secure=secure, httponly=True, samesite="lax")
        return {"ok": True}

    @app.patch("/api/profile")
    def profile(body: ProfileRequest, user=Depends(current_user)):
        nickname = body.nickname.strip()
        if not nickname or any(ord(c) < 32 for c in nickname):
            raise HTTPException(422, "昵称须为 1 至 32 个可显示字符")
        with db(write=True) as connection:
            connection.execute("UPDATE users SET nickname=? WHERE id=?", (nickname, user["id"]))
            audit(connection, user["id"], "profile", user["id"])
        return {"ok": True}

    def serialize_work(connection, row, private=False):
        result = dict(row)
        result["creator_id"] = row["user_id"]
        result["featured"] = connection.execute("SELECT 1 FROM featured_works WHERE work_id=?", (row["id"],)).fetchone() is not None
        if not private:
            for field in ("username", "reason", "user_id"):
                result.pop(field, None)
        result["images"] = [image["id"] for image in connection.execute(
            "SELECT id FROM images WHERE work_id=? AND purged=0 ORDER BY position", (row["id"],))]
        return result

    def list_works(connection, where, params, page, private, featured=False):
        count = connection.execute("SELECT COUNT(*) FROM works w JOIN users u ON u.id=w.user_id WHERE " + where, params).fetchone()[0]
        rows = connection.execute(
            "SELECT w.*,u.nickname,u.username FROM works w JOIN users u ON u.id=w.user_id WHERE " + where +
            (" ORDER BY (SELECT selected_at FROM featured_works WHERE work_id=w.id) DESC,w.id LIMIT 24 OFFSET ?" if featured else
             " ORDER BY w.created_at DESC,w.id LIMIT 24 OFFSET ?"), (*params, (page - 1) * 24)).fetchall()
        return {"items": [serialize_work(connection, row, private) for row in rows], "total": count, "page": page}

    def search_works(query, private=False):
        if len(query) > 100:
            raise HTTPException(422, "搜索词最多 100 个字符")
        query = query.strip().lower()
        if not query:
            return "", ()
        # instr treats %, _ and quotes literally rather than as LIKE wildcards.
        fields = ["w.title", "w.description", "u.nickname"]
        if private:
            fields.append("u.username")
        return " AND (" + " OR ".join(f"instr(lower({field}),?)>0" for field in fields) + ")", tuple(query for _ in fields)

    @app.get("/api/works")
    def works(page: int = 1, category: str = "", branch: str = "", featured: bool = False, q: str = ""):
        if page < 1 or page > 100000 or (category and category not in CATEGORIES):
            raise HTTPException(422, "无效筛选条件")
        if branch and not valid_branch(category, branch):
            raise HTTPException(422, "请选择该部门下的有效分支")
        where, params = "w.status='approved' AND u.disabled=0", ()
        if category:
            where, params = where + " AND w.category=?", (category,)
        if branch:
            where, params = where + " AND w.branch=?", (*params, branch)
        if featured:
            where += " AND EXISTS(SELECT 1 FROM featured_works WHERE work_id=w.id)"
        search, values = search_works(q)
        where, params = where + search, (*params, *values)
        with db() as connection:
            return list_works(connection, where, params, page, False, featured)

    @app.get("/api/creators/{creator_id}")
    def creator_profile(creator_id: str, page: int = 1, category: str = ""):
        if page < 1 or page > 100000 or (category and category not in CATEGORIES):
            raise HTTPException(422, "无效筛选条件")
        with db() as connection:
            creator = connection.execute("SELECT id,nickname FROM users WHERE id=? AND disabled=0 AND EXISTS(SELECT 1 FROM works WHERE user_id=users.id AND status='approved')", (creator_id,)).fetchone()
            if not creator:
                raise HTTPException(404, "创作者暂无公开作品或主页暂不可用")
            where, params = "w.user_id=? AND w.status='approved' AND u.disabled=0", (creator_id,)
            counts = {row['category']: row['total'] for row in connection.execute("SELECT category,COUNT(*) AS total FROM works WHERE user_id=? AND status='approved' GROUP BY category", (creator_id,))}
            if category:
                where, params = where + " AND w.category=?", (*params, category)
            return {"id": creator["id"], "nickname": creator["nickname"], "counts": counts, "works": list_works(connection, where, params, page, False)}

    @app.get("/api/works/{work_id}")
    def work_detail(work_id: str):
        with db() as connection:
            row = connection.execute("SELECT w.*,u.nickname FROM works w JOIN users u ON u.id=w.user_id "
                                     "WHERE w.id=? AND w.status='approved' AND u.disabled=0", (work_id,)).fetchone()
            if not row:
                raise HTTPException(404, "作品不存在或暂未公开")
            result = serialize_work(connection, row)
            result["published_at"] = connection.execute("SELECT MAX(created_at) FROM audit WHERE target_id=? AND action='approved'", (work_id,)).fetchone()[0]
            return result

    @app.get("/api/notifications/unread")
    def unread_notifications(user=Depends(current_user)):
        with db() as connection:
            return {"unread": connection.execute("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL", (user["id"],)).fetchone()[0]}

    @app.get("/api/notifications")
    def notifications(page: int = 1, user=Depends(current_user)):
        if page < 1 or page > 100000:
            raise HTTPException(422, "无效页码")
        with db() as connection:
            total = connection.execute("SELECT COUNT(*) FROM notifications WHERE user_id=?", (user["id"],)).fetchone()[0]
            rows = connection.execute("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 24 OFFSET ?", (user["id"], (page - 1) * 24)).fetchall()
            return {"items": [{key: row[key] for key in ("id", "work_id", "title", "status", "reason", "created_at", "read_at")} for row in rows], "total": total, "page": page}

    @app.patch("/api/notifications/{notification_id}/read")
    def read_notification(notification_id: int, user=Depends(current_user)):
        with db(write=True) as connection:
            result = connection.execute("UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?", (now(), notification_id, user["id"]))
            if not result.rowcount:
                raise HTTPException(404, "通知不存在")
        return {"ok": True}

    @app.get("/api/my/works")
    def my_works(page: int = 1, q: str = "", status: str = "", user=Depends(current_user)):
        if page < 1 or page > 100000 or status not in {"", "pending", "approved", "rejected", "deleted"}:
            raise HTTPException(422, "无效筛选条件")
        search, values = search_works(q, True)
        where, params = "w.user_id=?" + search, (user["id"], *values)
        if status:
            where, params = where + " AND w.status=?", (*params, status)
        with db() as connection:
            return list_works(connection, where, params, page, True)

    @app.post("/api/works", status_code=201)
    async def upload(request: Request, title: str = Form(min_length=1, max_length=100),
                     description: str = Form(default="", max_length=2000),
                     category: str = Form(), branch: str = Form(default="其他"), rights: bool = Form(), files: list[UploadFile] = File(),
                     user=Depends(current_user)):
        if category not in CATEGORIES or not rights or not title.strip():
            raise HTTPException(422, "请填写标题、分类并确认作品授权")
        if not valid_branch(category, branch):
            raise HTTPException(422, "请选择该部门下的有效分支")
        if not 1 <= len(files) <= 6:
            raise HTTPException(422, "每件作品需要 1 至 6 张图片")
        with db(write=True) as connection:
            blocked = limited(connection, "upload:" + user["id"], 10, 86400)
        if blocked:
            raise HTTPException(429, "每日最多提交 10 次作品，请明天再试")
        images = []
        async with upload_lock:
            try:
                for file in files:
                    data = await file.read(8 * 1024 * 1024 + 1)
                    images.append(await run_in_threadpool(clean_image, data))
            except ValueError as error:
                raise HTTPException(422, str(error)) from None
            finally:
                for file in files:
                    await file.close()
        work_id = str(uuid.uuid4())

        def save():
            # Hold the write transaction across storage writes so quota checks and publication are atomic.
            # On storage failure, record inaccessible files for retryable maintenance cleanup.
            keys = []
            try:
                with db(write=True) as connection:
                    if not connection.execute("SELECT 1 FROM branches WHERE category=? AND name=?", (category, branch)).fetchone():
                        raise HTTPException(409, "分支已调整，请刷新后重新选择")
                    active = connection.execute("SELECT disabled FROM users WHERE id=?", (user["id"],)).fetchone()
                    if active["disabled"]:
                        raise HTTPException(403, "账号不可用")
                    count = connection.execute("SELECT COUNT(*) FROM works WHERE user_id=? AND status!='deleted'", (user["id"],)).fetchone()[0]
                    if count >= 100:
                        raise HTTPException(409, "最多保留 100 件作品，请先删除不需要的投稿")
                    connection.execute("INSERT INTO works VALUES(?,?,?,?,?,'pending','',?,?,?)",
                                       (work_id, user["id"], title.strip(), description.strip(), category, now(), now(), branch))
                    for index, data in enumerate(images):
                        image_id = str(uuid.uuid4())
                        key = f"community/{work_id}/{image_id}.jpg"
                        keys.append((image_id, key, index, len(data)))
                        storage.put(key, data)
                        connection.execute("INSERT INTO images VALUES(?,?,?,?,?,0)", (image_id, work_id, key, index, len(data)))
                    audit(connection, user["id"], "upload", work_id, f"{title.strip()} · {CATEGORIES[category]['name']} / {branch}")
            except Exception:
                if keys:
                    with db(write=True) as connection:
                        connection.execute("INSERT OR IGNORE INTO works VALUES(?,?,?,?,?,'deleted','上传失败',?,?,?)",
                                           (work_id, user["id"], title.strip(), "", category, now(), now(), branch))
                        for image_id, key, index, size in keys:
                            connection.execute("INSERT OR IGNORE INTO images VALUES(?,?,?,?,?,0)", (image_id, work_id, key, index, size))
                raise
        try:
            await run_in_threadpool(save)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503, "作品保存失败，请稍后重试") from None
        return {"id": work_id, "status": "pending"}

    @app.get("/api/my/works/{work_id}")
    def editable_work(work_id: str, user=Depends(current_user)):
        with db() as connection:
            row = connection.execute("SELECT w.*,u.nickname,u.username FROM works w JOIN users u ON u.id=w.user_id "
                                     "WHERE w.id=? AND w.user_id=? AND w.status!='deleted'", (work_id, user["id"])).fetchone()
            if not row:
                raise HTTPException(404, "作品不存在或不可编辑")
            return serialize_work(connection, row, True)

    @app.post("/api/works/{work_id}/revision")
    async def revise_work(work_id: str, title: str = Form(min_length=1, max_length=100),
                          description: str = Form(default="", max_length=2000), category: str = Form(),
                          branch: str = Form(), rights: bool = Form(), revision: int = Form(),
                          order: str = Form(max_length=1000), files: list[UploadFile] = File(default=[]),
                          user=Depends(current_user)):
        if not title.strip() or not rights or category not in CATEGORIES or not valid_branch(category, branch):
            raise HTTPException(422, "请填写标题、有效分支并确认作品授权")
        try:
            manifest = json.loads(order)
            if not isinstance(manifest, list) or not 1 <= len(manifest) <= 6 or not all(isinstance(item, str) for item in manifest):
                raise ValueError()
            if len(set(manifest)) != len(manifest) or len(files) > 6:
                raise ValueError()
            if {item for item in manifest if item.startswith('new:')} != {f'new:{index}' for index in range(len(files))}:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(422, "图片顺序无效，请保留 1 至 6 张图片") from None

        def validate_current(connection):
            if not connection.execute("SELECT 1 FROM branches WHERE category=? AND name=?", (category, branch)).fetchone():
                raise HTTPException(409, "分支已调整，请刷新后重新选择")
            work = connection.execute("SELECT w.*,u.disabled FROM works w JOIN users u ON u.id=w.user_id WHERE w.id=? AND w.user_id=?", (work_id, user["id"])).fetchone()
            if not work or work["status"] == "deleted":
                raise HTTPException(404, "作品不存在或不可编辑")
            if work["disabled"]:
                raise HTTPException(403, "账号不可用")
            if work["updated_at"] != revision:
                raise HTTPException(409, "作品状态已变化，请重新打开编辑页面后再提交")
            existing = {row["id"]: row for row in connection.execute("SELECT * FROM images WHERE work_id=? AND purged=0", (work_id,))}
            if any(item not in existing for item in manifest if not item.startswith('new:')):
                raise HTTPException(422, "只能使用这件作品已有的图片")
            return work, existing

        with db(write=True) as connection:
            validate_current(connection)
            blocked = limited(connection, "upload:" + user["id"], 10, 86400)
        if blocked:
            raise HTTPException(429, "每日最多提交或修改 10 次作品，请明天再试")
        images = []
        async with upload_lock:
            try:
                for file in files:
                    images.append(await run_in_threadpool(clean_image, await file.read(8 * 1024 * 1024 + 1)))
            except ValueError as error:
                raise HTTPException(422, str(error)) from None
            finally:
                for file in files:
                    await file.close()

        def save_revision():
            keys = []
            try:
                with db(write=True) as connection:
                    work, existing = validate_current(connection)
                    for position, item in enumerate(manifest):
                        if item.startswith('new:'):
                            data = images[int(item[4:])]
                            image_id = str(uuid.uuid4())
                            key = f"community/{work_id}/{image_id}.jpg"
                            keys.append(key)
                            storage.put(key, data)
                            connection.execute("INSERT INTO images VALUES(?,?,?,?,?,0)", (image_id, work_id, key, position, len(data)))
                        else:
                            connection.execute("UPDATE images SET position=? WHERE id=?", (position, item))
                    for image_id, row in existing.items():
                        if image_id not in manifest:
                            connection.execute("INSERT OR IGNORE INTO obsolete_objects VALUES(?,?)", (row["object_key"], now()))
                            connection.execute("DELETE FROM images WHERE id=?", (image_id,))
                    connection.execute("DELETE FROM featured_works WHERE work_id=?", (work_id,))
                    connection.execute("UPDATE works SET title=?,description=?,category=?,branch=?,status='pending',reason='',updated_at=? WHERE id=?",
                                       (title.strip(), description.strip(), category, branch, max(now(), work["updated_at"] + 1), work_id))
                    audit(connection, user["id"], "revise", work_id, f"{title.strip()} · {work['status']} → pending")
            except Exception:
                if keys:
                    with db(write=True) as connection:
                        connection.executemany("INSERT OR IGNORE INTO obsolete_objects VALUES(?,?)", [(key, now()) for key in keys])
                raise
        try:
            await run_in_threadpool(save_revision)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503, "修改保存失败，原作品未改变，请稍后重试") from None
        return {"id": work_id, "status": "pending"}

    @app.get("/api/images/{image_id}")
    def image(image_id: str, request: Request, size: str = "original"):
        if size not in {"original", "thumb"}:
            raise HTTPException(422, "无效图片尺寸")
        with db() as connection:
            row = connection.execute("SELECT i.*,w.status,w.user_id,w.category,u.disabled FROM images i JOIN works w ON w.id=i.work_id "
                                     "JOIN users u ON u.id=w.user_id WHERE i.id=? AND i.purged=0", (image_id,)).fetchone()
        if not row or row["status"] == "deleted":
            raise HTTPException(404, "图片不存在")
        if row["status"] != "approved" or row["disabled"]:
            user = current_user(request)
            if user["id"] != row["user_id"] and (user["role"] not in {"owner", "admin"} or (user["role"] == "admin" and user["department"] and user["department"] != row["category"])):
                raise HTTPException(404, "图片不存在")
        return Response(storage.get(row["object_key"], thumbnail=True) if size == "thumb" else storage.get(row["object_key"]), media_type="image/jpeg")

    @app.delete("/api/works/{work_id}")
    def delete_own(work_id: str, user=Depends(current_user)):
        with db(write=True) as connection:
            work = connection.execute("SELECT * FROM works WHERE id=? AND user_id=?", (work_id, user["id"])).fetchone()
            if not work:
                raise HTTPException(404, "作品不存在")
            if work["status"] != "deleted":
                connection.execute("DELETE FROM featured_works WHERE work_id=?", (work_id,))
                connection.execute("UPDATE works SET status='deleted',reason='作者删除',updated_at=? WHERE id=?", (now(), work_id))
                audit(connection, user["id"], "delete_own", work_id, work["title"])
        return {"ok": True}

    @app.get("/api/admin/overview")
    def overview(user=Depends(administrator)):
        with db() as connection:
            if user['role'] == 'admin' and user['department']:
                category = user['department']
                return {
                    'users': connection.execute("SELECT COUNT(DISTINCT user_id) FROM works WHERE category=? AND status!='deleted'", (category,)).fetchone()[0],
                    'works': connection.execute("SELECT COUNT(*) FROM works WHERE category=? AND status!='deleted'", (category,)).fetchone()[0],
                    'pending': connection.execute("SELECT COUNT(*) FROM works WHERE category=? AND status='pending'", (category,)).fetchone()[0],
                    'logins': None,
                }
            return {
                "users": connection.execute("SELECT COUNT(*) FROM users").fetchone()[0],
                "study_pending": connection.execute("SELECT COUNT(*) FROM study_documents WHERE status='pending'").fetchone()[0],
                "works": connection.execute("SELECT COUNT(*) FROM works WHERE status!='deleted'").fetchone()[0],
                "pending": connection.execute("SELECT COUNT(*) FROM works WHERE status='pending'").fetchone()[0],
                "logins": connection.execute("SELECT COUNT(*) FROM login_events WHERE success=1 AND created_at>?", (now() - 86400,)).fetchone()[0],
            }

    @app.get("/api/admin/users")
    def users(q: str = "", page: int = 1, user=Depends(full_administrator)):
        if len(q) > 100 or page < 1 or page > 100000:
            raise HTTPException(422, "无效查询条件")
        with db() as connection:
            params = (f"%{q}%", f"%{q}%")
            count = connection.execute("SELECT COUNT(*) FROM users WHERE username LIKE ? OR nickname LIKE ?", params).fetchone()[0]
            rows = connection.execute("SELECT u.*, (SELECT COUNT(*) FROM study_documents d WHERE d.user_id=u.id) AS study_count, (SELECT COUNT(*) FROM works w WHERE w.user_id=u.id) AS work_count, "
                                      "(SELECT COUNT(*) FROM login_events l WHERE l.user_id=u.id AND l.success=1) AS login_count "
                                      "FROM users u WHERE username LIKE ? OR nickname LIKE ? ORDER BY created_at DESC,id LIMIT 24 OFFSET ?",
                                      (*params, (page - 1) * 24)).fetchall()
        return {"items": [{**public_user(row), "study_count": row['study_count'], "work_count": row["work_count"], "login_count": row["login_count"]} for row in rows], "total": count, "page": page}

    @app.patch("/api/admin/users/{user_id}/role")
    def change_role(user_id: str, body: RoleRequest, user=Depends(owner)):
        if body.department is not None and body.department not in CATEGORIES:
            raise HTTPException(422, "无效管理部门")
        with db(write=True) as connection:
            target = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if not target:
                raise HTTPException(404, "用户不存在")
            if target["role"] == "owner":
                raise HTTPException(403, "总管理员身份不可在此修改")
            connection.execute("UPDATE users SET role=? WHERE id=?", (body.role, user_id))
            connection.execute("DELETE FROM admin_departments WHERE user_id=?", (user_id,))
            if body.role == "admin" and body.department:
                connection.execute("INSERT INTO admin_departments VALUES(?,?)", (user_id, body.department))
            connection.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
            audit(connection, user["id"], "role", user_id, target["role"] + " → " + body.role + " / " + (body.department or "全站"))
        return {"ok": True}

    @app.patch("/api/admin/users/{user_id}/disabled")
    def disable(user_id: str, body: DisableRequest, user=Depends(owner)):
        with db(write=True) as connection:
            target = connection.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if not target:
                raise HTTPException(404, "用户不存在")
            if target["role"] == "owner":
                raise HTTPException(403, "总管理员账号不可停用")
            connection.execute("UPDATE users SET disabled=? WHERE id=?", (int(body.disabled), user_id))
            connection.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
            audit(connection, user["id"], "disable" if body.disabled else "enable", user_id)
        return {"ok": True}

    @app.get("/api/admin/works")
    def admin_works(status: str = "", user_id: str = "", page: int = 1, category: str = "", branch: str = "", q: str = "", user=Depends(administrator)):
        if status not in {"", "pending", "approved", "rejected", "deleted"} or page < 1 or page > 100000:
            raise HTTPException(422, "无效查询条件")
        where, params = ["1=1"], []
        if user["role"] == "admin" and user["department"]:
            where.append("w.category=?")
            params.append(user["department"])
        if category and category not in CATEGORIES:
            raise HTTPException(422, "无效部门")
        if branch and not valid_branch(category, branch):
            raise HTTPException(422, "无效分支")
        if category:
            where.append("w.category=?")
            params.append(category)
        if branch:
            where.append("w.branch=?")
            params.append(branch)
        if status:
            where.append("w.status=?")
            params.append(status)
        if user_id:
            where.append("w.user_id=?")
            params.append(user_id)
        search, values = search_works(q, True)
        with db() as connection:
            return list_works(connection, " AND ".join(where) + search, (*params, *values), page, True)

    @app.patch("/api/admin/works/{work_id}/featured")
    def feature_work(work_id: str, body: FeaturedRequest, user=Depends(administrator)):
        with db(write=True) as connection:
            work = connection.execute("SELECT w.*,u.disabled FROM works w JOIN users u ON u.id=w.user_id WHERE w.id=?", (work_id,)).fetchone()
            if not work:
                raise HTTPException(404, "作品不存在")
            check_department(user, work["category"])
            if body.featured:
                if work["status"] != "approved" or work["disabled"]:
                    raise HTTPException(409, "仅可精选正常账号的公开作品")
                if connection.execute("SELECT 1 FROM featured_works WHERE work_id=?", (work_id,)).fetchone():
                    return {"ok": True}
                if connection.execute("SELECT COUNT(*) FROM featured_works").fetchone()[0] >= 12:
                    raise HTTPException(409, "首页最多精选 12 件作品，请先取消其他精选")
                connection.execute("INSERT INTO featured_works VALUES(?,?)", (work_id, now()))
            else:
                if not connection.execute("DELETE FROM featured_works WHERE work_id=?", (work_id,)).rowcount:
                    return {"ok": True}
            audit(connection, user["id"], "feature" if body.featured else "unfeature", work_id, work["title"])
        return {"ok": True}

    @app.patch("/api/admin/works/{work_id}")
    def moderate(work_id: str, body: ModerationRequest, user=Depends(administrator)):
        if body.status in {"rejected", "deleted"} and not body.reason.strip():
            raise HTTPException(422, "请填写退回或删除原因")
        with db(write=True) as connection:
            work = connection.execute("SELECT * FROM works WHERE id=?", (work_id,)).fetchone()
            if not work:
                raise HTTPException(404, "作品不存在")
            check_department(user, work["category"])
            if work["status"] == "deleted":
                raise HTTPException(409, "作品已经删除")
            if body.revision is not None and body.revision != work["updated_at"]:
                raise HTTPException(409, "作品已被修改或处理，请刷新后重新核对")
            if work["status"] == body.status and work["reason"] == body.reason.strip():
                return {"ok": True}
            if body.status != "approved":
                connection.execute("DELETE FROM featured_works WHERE work_id=?", (work_id,))
            connection.execute("UPDATE works SET status=?,reason=?,updated_at=? WHERE id=?", (body.status, body.reason.strip(), max(now(), work["updated_at"] + 1), work_id))
            connection.execute("INSERT INTO notifications(user_id,work_id,title,status,reason,created_at) VALUES(?,?,?,?,?,?)",
                               (work["user_id"], work_id, work["title"], body.status, body.reason.strip(), now()))
            audit(connection, user["id"], body.status, work_id, json.dumps({"title": work["title"], "reason": body.reason.strip()}, ensure_ascii=False))
        return {"ok": True}

    @app.get("/api/admin/logins")
    def logins(user_id: str = "", page: int = 1, user=Depends(full_administrator)):
        if page < 1 or page > 100000:
            raise HTTPException(422, "无效页码")
        where, params = ("l.user_id=?", (user_id,)) if user_id else ("1=1", ())
        with db() as connection:
            total = connection.execute("SELECT COUNT(*) FROM login_events l WHERE " + where, params).fetchone()[0]
            rows = connection.execute("SELECT l.*,u.nickname FROM login_events l LEFT JOIN users u ON u.id=l.user_id WHERE " + where +
                                      " ORDER BY l.id DESC LIMIT 24 OFFSET ?", (*params, (page - 1) * 24)).fetchall()
        return {"items": [dict(row) for row in rows], "total": total, "page": page}

    @app.get("/api/admin/audit")
    def audit_log(page: int = 1, user=Depends(full_administrator)):
        if page < 1 or page > 100000:
            raise HTTPException(422, "无效页码")
        with db() as connection:
            total = connection.execute("SELECT COUNT(*) FROM audit").fetchone()[0]
            rows = connection.execute("SELECT a.*,u.username,u.nickname FROM audit a LEFT JOIN users u ON u.id=a.actor_id "
                                      "ORDER BY a.id DESC LIMIT 24 OFFSET ?", ((page - 1) * 24,)).fetchall()
        return {"items": [dict(row) for row in rows], "total": total, "page": page}

    return app
