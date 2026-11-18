# 内部学习资料共享

`/study` 是青年媒体中心内部学习交流的资料入口，不是新增的正式部门。
此说明表示内容用途；当前资料链接可直接访问，并没有成员身份访问限制。

资料目录保存在 `src/data/study-files.json`。原文件和 Word 预览存放于现有
OSS 网站桶的 `study-files/` 前缀，**不提交原文件、转换结果或凭据到 Git**。
PDF.js 阅读器按页请求资料；Word 使用本机 Word 导出 PDF 后预览，保留原文件下载。
ZIP/RAR 只提供下载。旧 DOC 版式以原文件为准。

`/study/submit` 使用原有网站账号投稿。单次一份、最多 40 MB，每人每日最多
10 次、在库总量最多 200 MB / 100 份。资料先进入私有 OSS 保存，作者与全站
管理员可查看待审核内容，审核通过后进入“同学分享”。后台“学习资料”提供
审核、退回、删除及上传者信息，处理原因进入审计和作者通知。
部门管理员不自动获得跨部门学习资料管理权限。

新上传 PDF 支持 Range 在线预览；DOCX 使用标准库提取文字，DOC 在服务器
安装 `antiword` 后由受 CPU、内存、输出大小限制的子进程提取文字。
Word 文字预览不保留图片、公式及表格版式，页面提示用户下载原件或上传 PDF。
压缩包不在线解压或执行。类型检查并不替代管理员内容审核。
删除后立即撤销访问，原文件由既有每日维护任务清除。

更新资料时，在项目根目录执行：

```powershell
python tools/prepare-study.py '资料源目录' .cache/study-documents
./tools/convert-study.ps1 -Jobs .cache/study-documents/word-jobs.json
python tools/prepare-study.py '资料源目录' .cache/study-documents --finalize
python tools/publish-study.py .cache/study-documents/uploads.json '本地 ossutilconfig 路径'
npm run build
```

准备脚本需要 Python 3.11+，最终检查需要 `pypdf`；上传脚本需要 `oss2`。
转换器仅打开只读源文件并禁用宏；它使用独立的 Word 实例。
修改了 Word 原件后，应使用新的缓存目录重新转换，避免复用旧预览。
发布前核对文件数量、预览和下载，先发布所有资源，最后更新 `index.html`。
`npm run build` 自动复制当前 PDF.js 版本的字体、CMap、解码器资源。

主站直接从 OSS 读取文件；备用站 Nginx 仅代理 `/study-files/` 到固定 OSS 桶，
保留 Range 请求，且不转发用户 Cookie 或 Authorization。
备用站需同时发布 `dist/pdfjs/` 并使用 `server/deploy/nginx.conf` 的相关配置。
不修改现有作品上传桶及其权限。
