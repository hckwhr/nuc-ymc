# 部署指南 · 阿里云 OSS（香港）静态托管 → nuc-ymc.com

## 当前部署与证书维护（2026-11-07）

- 正式域名：`nuc-ymc.com`；实际 Bucket：`nuc-ymc-site`，地域：香港。
- 实际项目为 React 18 + TypeScript + Vite + Tailwind，首页和七个部门独立页面均已实现；早期《方案确认书》中的“三个子站 / 原生 JS / Cloudflare 首选”不代表当前状态。
- 网站公开素材共 154 张 JPG/PNG 和 15 个 MP4；`src/data/site.ts` 的统计数字仍标注为占位，部分部门说明也需业务确认。
- `www.nuc-ymc.com` 当前无 DNS 记录；本站证书工具只维护已有的根域名。
- 2026-11-07 检查发现线上 Let's Encrypt 证书已于 **2026-10-14 13:33:47 UTC** 到期。OSS 中“证书绑定 Enabled”仅代表配置存在，不代表证书仍有效。
- 本次续签同时核对了 TLS 算法：仅更新 RSA 后，实测 ECDSA 握手仍返回旧证书，因此继续签发并绑定了与原站一致的 P-256 ECDSA 证书。新 ECDSA 证书到期时间为 **2027-02-05 11:55:22 UTC（北京时间 19:55:22）**。不能用单次 RSA 握手成功代替浏览器默认连接的验收。
- 修复后验证：默认 TLS、ECDSA AES-128 / AES-256 信任校验通过；首页和七个部门路由、JS/CSS、Logo、二维码、首页视频及 OSS 缩略图均通过 HTTPS 返回 200。首页内容 MD5 与修复前一致。`npm run build`、282 处源码素材引用检查及 9 项证书工具离线测试通过；未进行浏览器视觉/交互回归。

### 检查与续签

在项目根目录执行（Python 3.11+）：

```powershell
python -m pip install --target .cache/cert-tools -r tools/requirements-certificates.txt
python tools/renew_certificate.py
python tools/renew_certificate.py --renew
```

不带参数只检查线上证书；距到期不超过 30 天或已过期时返回非零退出码。默认分别检查 ECDSA 和 RSA；若服务仅启用 ECDSA、明确拒绝 RSA 握手，且 ECDSA 已验证，则跳过 RSA。不会忽略 RSA 证书过期或不可信错误。也可用 `--algorithm ecdsa` / `--algorithm rsa` 单独诊断。

`--renew` 仅在需要时申请同算法的 Let's Encrypt 证书，通过该站点 HTTP-01 验证，然后替换 OSS 的证书绑定。签发过程使用 Let's Encrypt ACME 客户端，注册账户时接受其服务条款；不填写或发送项目联系邮箱。

工具从现有、被 Git 忽略的 `ossutilconfig` 读取凭据，固定限定本站域名、Bucket 和香港 Endpoint。所需权限包括该 Bucket 的域名读取/配置、临时验证对象写入/删除，以及 OSS 证书绑定所需的证书服务权限。凭据不得粘贴到源码或日志。

续签期间只创建随机名称的 `/.well-known/acme-challenge/` 验证对象，验证后清理；替换绑定时校验旧证书 ID，避免覆盖其他人的并行更新。证书及私钥保存到被 Git 忽略的 `.certificates/`；若部署中断，重跑时优先使用已签发、算法一致且仍有效的证书。已绑定相同证书时只等待分发生效，不重复上传。工具连续三次检查对应算法的公网信任链、新证书指纹和 HTTPS 首页，最多等待约五分钟；失败保留已签发文件，随后可再次只读检查。

部署后还需使用客户端默认 TLS 配置检查首页、七个部门路由及主要静态资源，避免算法专用检查漏掉未同步的接入节点。修改工具后可运行 `python -m unittest discover -s tools -p 'test_renew_certificate.py' -v`，离线测试不会连接云服务。

**此工具不会自行安装定时任务。** 应在稳定联网的受控主机上每天执行 `--renew` 并监控非零退出码，或配置阿里云证书自动续期及自动部署。仅绑定一次免费证书不等于完成自动续期。保管好 `ossutilconfig` 和 `.certificates/`，不要上传到公开 Bucket。

以下保留首次部署步骤，便于重建环境。

> 目标：把 `dist/` 里的网站，托管到阿里云 OSS 香港存储桶（免备案），绑定 nuc-ymc.com，开 HTTPS。
> 全程用你已有的阿里云账号。DNS 不用搬走，只在阿里云内部加记录。

---

## 路线总览（4 步）

1. **建桶** —— 香港地域、公共读的 OSS 存储桶
2. **开静态托管** —— 设首页 index.html、SPA 回退
3. **上传网站** —— 把 `dist/` 传进桶（我用 ossutil 帮你传）
4. **绑域名 + HTTPS** —— 绑 nuc-ymc.com、自动加 CNAME、挂免费证书

---

## 第 1 步：创建 OSS 存储桶（Bucket）

1. 登录 **阿里云控制台** → 搜索进入 **对象存储 OSS** → 概览 → **创建 Bucket**
2. 按下面填：
   | 项 | 填什么 |
   |---|---|
   | **Bucket 名称** | `nuc-ymc-site`（若被占用换一个，如 `nuc-ymc-web`；**记下这个名字**）|
   | **地域** | **中国香港（oss-cn-hongkong）** ← 关键，免备案就靠它 |
   | **读写权限** | **公共读**（Public Read）|
   | 存储类型 | 标准存储 |
   | 版本控制/同城冗余等 | 全部**默认关闭** |
3. 点**创建**。

> 建好后，进入这个 Bucket，在「概览」里能看到一条 **外网访问 Endpoint**，形如
> `nuc-ymc-site.oss-cn-hongkong.aliyuncs.com` —— 后面绑域名要用。

✅ **完成第 1 步后，把你实际用的 Bucket 名字告诉我**，我继续带你做第 2、3 步。

---

## 第 2 步：开启静态网站托管（建好桶后做）

进入 Bucket → 左侧 **数据管理 → 静态页面**（或「基础设置 → 静态页面」）：
- **默认首页**：`index.html`
- **默认 404 页**：`index.html` ←（让 /photography 等子页刷新不 404，SPA 回退）
- 保存。

---

## 第 3 步：上传网站（我用 ossutil 帮你传）

网站产物在本机 `dist/`（约 65MB）。两种传法：
- **A. 我帮你传（推荐）**：你创建一个只给 OSS 权限的 AccessKey，我用 ossutil 一键上传，以后更新也一键。
- **B. 你自己传**：Bucket → 文件管理 → 上传 → 把 `dist` 文件夹里的**所有内容**拖进去（注意是 dist 里面的东西，不是 dist 文件夹本身）。

---

## 第 4 步：绑定 nuc-ymc.com + HTTPS

进入 Bucket → **传输管理 → 域名管理 → 绑定自定义域名**：
1. 填 `nuc-ymc.com`（如需 www 再加 `www.nuc-ymc.com`）
2. 勾选 **自动添加 CNAME 记录**（同账号会自动在云解析里加好，apex 也能处理）
3. 绑定后 → **证书托管** → 为该域名**申请/上传免费 SSL 证书**（阿里云免费 DV 证书），开启 HTTPS。

> 生效通常几分钟~最长几小时（DNS 传播）。之后浏览器打开 https://nuc-ymc.com 就是正式网站。

---

## 以后更新网站怎么办
改完内容 → 本机 `npm run build` → 重新上传 `dist/`（ossutil 一键覆盖）。我可以帮你每次做。
