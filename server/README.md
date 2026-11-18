# 用户投稿与管理后台

生产 API 与备用前端为 https://api.nuc-ymc.com ，主站 https://nuc-ymc.com 通过 HTTPS 调用同站 API。香港轻量服务器运行 Nginx、单进程 Uvicorn/FastAPI 和 SQLite。作品存放在 OSS 私有对象中，读取经过后端权限检查。

## 账号和权限

- 用户名 4–32 位，以字母开头，可含数字和下划线，不区分大小写。注册密码至少 12 个字符，使用带随机盐的 scrypt 保存。
- 总管理员用户名默认 `hck_admin`，由服务器命令行初始化。注册接口保留该用户名且始终只创建普通用户。
- 总管理员可任免管理员、停用用户。管理员可查看用户、登录记录、作品、操作审计，并审核、退回或删除作品。
- 任免或停用会撤销目标用户全部会话。修改密码撤销其他会话。总管理员敏感操作要求 30 分钟内登录。
- 首次登录总管理员和命令行重置的账号须修改初始密码。
- 忘记密码时，运营方须先独立核实身份，再在服务器运行 `python -m server.manage reset-password --username USER --output PRIVATE_FILE`。此命令要求加载生产环境配置。

## 生产路径

- `/opt/nuc-ymc/app` 源码，`/opt/nuc-ymc/venv` Python 环境。
- `/etc/nuc-ymc.env` 配置与凭据，权限 600，不进入仓库。
- `/var/lib/nuc-ymc/community.sqlite3` 账号、作品元数据和审计数据库。
- `ymc.service` 后端服务，`ymc-maintain.timer` 每天清理删除作品、过期会话和 180 天前的日志。
- 维护任务保存 7 天本地数据库备份，并向 OSS 的 `community-backups/database-0..6.sqlite3` 私有对象轮换备份。恢复前停止服务，核对备份完整性，并考虑数据库备份引用的作品是否已删除。
- Certbot 定时续签 API 域名证书，部署钩子重载 Nginx。主站 OSS 证书仍使用项目原续签流程。

## 部署和验证

依赖见 `requirements.txt`，模板见 `deploy/` 与 `.env.example`。首次部署需已有 api 域名解析、80/443 端口和 HTTPS 证书。以受限 `ymc` 用户运行服务，仅监听 127.0.0.1:8000。Nginx 限制上传体积、认证请求速率和并发，并覆盖转发 IP 头。应用仅信任本地反向代理。

运行 `python -m unittest server.test_security -v` 验证主要权限、CSRF、密码更新、限流和投稿审核路径。前端运行 `npm run build`。部署后的实际 OSS 权限和网络需要额外验收。

每作品最多 6 张、单张 8 MB，静态 JPEG/PNG/WebP，经解码和重新编码移除元数据。每日每用户最多尝试 10 次投稿，最多保留 100 件。图片解码串行执行以控制 1 GB 主机内存。Nginx 全局上传连接限制为 2。

使用现有 OSS 凭据部署。后续可由账号所有者签发仅允许 `community/` 和 `community-backups/` 前缀读写删除的 RAM 凭据，替换环境变量并重启服务。数据库包含密码哈希，应保持备份私有。

这些措施不构成第三方安全认证。运营方仍需处理用户注销请求、审核投稿、监控磁盘与账单，以及维护服务器补丁。当前不支持自助邮箱找回密码。
