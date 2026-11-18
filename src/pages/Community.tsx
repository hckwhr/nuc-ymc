import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, API, CONSENT, dateText, roleName, statusName, useAuth, type Page, type Work } from "../lib/community";
import { SubmissionTree, DepartmentFilters } from "../components/SubmissionTree";
import { departmentNames as departments, type Department } from "../lib/categories";
import { logoSrc } from "../data/media";
import "../community.css";
import { NotificationLink } from "../components/NotificationLink";
import { WorkSearch } from "../components/WorkSearch";
import { Lightbox } from "../lib/Lightbox";

export function CommunityLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  return <div className="community-shell">
    <header className="community-header"><Link to="/" className="community-brand" aria-label="青年媒体中心，返回首页"><img src={logoSrc} alt="" />青年媒体中心</Link>
    <nav className="community-home-nav" aria-label="主站导航">
      <Link to="/" className="community-home-link"><span aria-hidden="true">↖</span> 返回首页</Link>
      <Link to="/#about">中心简介</Link><Link to="/#departments">部门展示</Link><Link to="/#works">作品墙</Link>
    </nav>
    <nav className="community-account-nav" aria-label="创作导航">
      <Link to="/community">作品社区</Link><Link to="/account">{user ? "投稿 / 我的作品" : "登录"}</Link>
      {!user && <Link className="header-register" to="/account?mode=register">注册账号</Link>}
      {user && <span className="header-identity">@{user.username}</span>}
      <NotificationLink />
      {user && user.role !== "user" && <Link to="/admin">管理后台</Link>}
      {user && <button onClick={() => void logout().catch(e => setError(e.message))}>退出登录</button>}
    </nav></header>
    <main className="community-main">{error && <p className="notice error" role="alert">{error}</p>}{children}</main>
    <footer className="community-footer"><Link to="/privacy">隐私说明与投稿规则</Link><span>青年媒体中心 · 共同记录校园</span></footer>
  </div>;
}

export function Pagination({ page, total, change }: { page: number; total: number; change: (page: number) => void }) {
  return <div className="pagination"><span>共 {total} 条 · 第 {page} 页</span><button disabled={page === 1} onClick={() => change(page - 1)}>上一页</button><button disabled={page * 24 >= total} onClick={() => change(page + 1)}>下一页</button></div>;
}

export function WorkCard({ work, children }: { work: Work; children?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="work-card">
    {work.images.length > 0 && <button className="work-cover" onClick={() => setExpanded(true)} aria-label={`查看 ${work.title}`}><img src={`${API}/api/images/${work.images[0]}?size=thumb`} alt={work.title} loading="lazy" /></button>}
    <div className="work-content"><div className="work-meta"><span>{departments[work.category as Department]?.name || work.category} · {work.branch || "其他"}</span><span className={`status ${work.status}`}>{statusName[work.status]}</span></div>
      <h2>{work.title}</h2><p className="muted">{work.creator_id ? <Link to={`/creators/${work.creator_id}`}>{work.nickname} ↗</Link> : work.nickname}{work.username && ` · ${work.username}`}</p><p>{work.description}</p><small>{dateText(work.created_at)}</small>
      {work.reason && <p className="notice">处理说明 · {work.reason}</p>}{children}</div>
    {work.status === "approved" && <div className="work-public-links"><span>{work.featured ? "编辑精选 · 已公开展示" : "已公开展示"}</span><Link to={`/works/${work.id}`}>作品详情 / 分享 ↗</Link><Link to="/#works">首页作品墙 ↗</Link><Link to={`/${work.category}#cat-${encodeURIComponent(work.branch || "其他")}`}>部门分支 ↗</Link></div>}
    {expanded && <Lightbox items={work.images.map(id => ({ type: "image", src: `${API}/api/images/${id}`, caption: work.title }))} index={0} onClose={() => setExpanded(false)} />}
  </article>;
}

export default function Community() {
  const [data, setData] = useState<Page<Work>>({ items: [], total: 0, page: 1 });
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const category = params.get("category") || "", branch = params.get("branch") || "", query = params.get("q") || "";
  const featured = params.get("featured") === "true";
  const [version, setVersion] = useState(0);
  function filter(values: Record<string, string>) {
    const next = new URLSearchParams(params); next.delete("page");
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    setParams(next);
  }
  const [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    const filters = new URLSearchParams({ page: String(page), category, branch, q: query, featured: String(featured) });
    api<Page<Work>>(`/works?${filters}`).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, category, branch, query, featured, version]);
  return <CommunityLayout><div className="page-heading"><div><p className="eyebrow">校园创作</p><h1>让作品被看见</h1><p className="muted">汇集摄影、设计与抖音部的创作，记录你眼中的校园。</p></div><Link className="primary button" to="/account">上传我的作品</Link></div>
    <section className="work-discovery" aria-label="查找公开作品"><WorkSearch value={query} onSearch={q => filter({ q })} />
    <DepartmentFilters category={category} branch={branch} onChange={(category, branch) => filter({ category, branch })} />
    <div className="discovery-options"><label className="checkbox-label"><input type="checkbox" checked={featured} onChange={e => filter({ featured: e.target.checked ? "true" : "" })} />只看编辑精选</label>{(query || category || branch || featured) && <button onClick={() => setParams({})}>重置全部筛选</button>}<span>筛选后的网址可以直接分享</span></div></section>
    {loading ? <p role="status">正在加载作品…</p> : error ? <div className="notice error" role="alert">{error} <button onClick={() => setVersion(v => v + 1)}>重新加载作品</button></div> : <><p className="search-result-note" role="status">{query ? `“${query}” · ` : ""}找到 {data.total} 件公开作品</p><div className="works-grid">{data.items.map(work => <WorkCard key={work.id} work={work} />)}</div>{data.items.length === 0 && <div className="empty-state"><p>{query || category || featured ? "没有符合条件的作品，试试其他关键词或部门。" : "还没有公开投稿，期待你的第一件作品。"}</p>{page > 1 && <button onClick={() => filter({})}>返回第一页</button>}</div>}<Pagination page={page} total={data.total} change={page => filter({ page: String(page) })} /></>}
  </CommunityLayout>;
}

export function LoginForm() {
  const { login } = useAuth();
  const [params, setParams] = useSearchParams();
  const register = params.get("mode") === "register";
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (register && password !== confirm) { setError("两次密码不一致，请重新确认"); return; }
    setBusy(true);
    try { await login(username, password, register); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="login-panel"><div className="auth-tabs" aria-label="账号入口"><button type="button" aria-pressed={!register} onClick={() => { setParams({}); setError(""); }}>登录</button><button type="button" aria-pressed={register} onClick={() => { setParams({ mode: "register" }); setError(""); }}>注册账号</button></div><p className="eyebrow">欢迎加入</p><h1>{register ? "起一个属于你的用户名" : "欢迎回到创作空间"}</h1><p className="muted">{register ? "注册成功即可投稿，无需等待账号审核。" : "用注册时设置的用户名和密码登录。"}</p>
    <form onSubmit={submit}><label>用户名<input autoComplete="username" required pattern="[a-zA-Z][a-zA-Z0-9_]{2,31}" maxLength={32} value={username} onChange={e => setUsername(e.target.value)} /><small>3 至 32 位，以字母开头，可含数字和下划线，不区分大小写。</small></label>
    <label>密码<input type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />{register && <small>至少 12 个字符，建议使用独立的长密码。</small>}</label>
    {register && <label>确认密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
    {register && <label className="checkbox-label"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>我已阅读并同意<Link to="/privacy" target="_blank">隐私说明与投稿规则</Link>。</span></label>}
    {error && <p className="notice error" role="alert">{error}</p>}<button className="primary" disabled={busy || (register && !consent)}>{busy ? "正在处理…" : register ? "注册并登录" : "登录"}</button>
    <button type="button" onClick={() => { setParams(register ? {} : { mode: "register" }); setError(""); setPassword(""); setConfirm(""); }}>{register ? "已有账号，去登录" : "还没有账号，注册"}</button>
    <small>忘记密码请联系网站运营方核实身份后重置。</small></form></section>;
}

export function PasswordForm() {
  const { refresh, user } = useAuth();
  const [current, setCurrent] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  return <section className="upload-panel"><h2>{user?.must_change_password ? "请先修改初始密码" : "修改密码"}</h2><form onSubmit={async e => {
    e.preventDefault(); if (password !== confirm) { setMessage("两次新密码不一致"); return; } setBusy(true); setMessage("");
    try { await api("/auth/password", { method: "POST", body: JSON.stringify({ current_password: current, password }) }); await refresh(); setCurrent(""); setPassword(""); setConfirm(""); setMessage("密码已修改，其他登录会话已退出。"); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }}><label>当前密码<input type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></label>
    <div className="form-columns"><label>新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label><label>确认新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label></div>
    {message && <p className="notice" role="status">{message}</p>}<button disabled={busy} className="primary">保存新密码</button></form></section>;
}

export function Account() {
  const { user, loading, error: serviceError, refresh } = useAuth();
  const [works, setWorks] = useState<Page<Work>>({ items: [], total: 0, page: 1 }), [page, setPage] = useState(1), [version, setVersion] = useState(0);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [nickname, setNickname] = useState("");
  const [query, setQuery] = useState(""), [status, setStatus] = useState(""), [fetching, setFetching] = useState(true), [workError, setWorkError] = useState("");
  useEffect(() => { setNickname(user?.nickname || ""); }, [user?.nickname]);
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true; setFetching(true); setWorkError("");
    const filters = new URLSearchParams({ page: String(page), q: query, status });
    api<Page<Work>>(`/my/works?${filters}`).then(data => { if (active) setWorks(data); }).catch(e => { if (active) setWorkError(e.message); }).finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [user?.id, user?.must_change_password, page, version, query, status]);
  async function remove(work: Work) {
    if (!window.confirm(`确定删除《${work.title}》？删除后作品将无法访问。`)) return;
    setBusy(true); setError("");
    try { await api(`/works/${work.id}`, { method: "DELETE" }); setVersion(v => v + 1); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <CommunityLayout>{loading ? <p>正在确认登录状态…</p> : !user ? <>{serviceError && <p className="notice error">{serviceError}</p>}<LoginForm /></> : user.must_change_password ? <PasswordForm /> : <>
    <div className="page-heading"><div><p className="eyebrow">{roleName[user.role]}</p><h1>我的创作空间</h1><p className="account-identity">登录用户名 <strong>@{user.username}</strong><span>公开昵称 · {user.nickname}</span></p></div>{user.role !== "user" && <Link className="button" to="/admin">进入管理后台</Link>}</div>
    <details className="account-settings"><summary>个人资料与账号安全</summary><form className="profile-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { await api("/profile", { method: "PATCH", body: JSON.stringify({ nickname }) }); await refresh(); setMessage("昵称已更新"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><label>公开昵称<input value={nickname} required maxLength={32} onChange={e => setNickname(e.target.value)} /></label><button disabled={busy}>保存昵称</button></form>
    <PasswordForm /></details>
    <SubmissionTree key={user.id} userId={user.id} onSubmitted={() => { setVersion(v => v + 1); setPage(1); setQuery(""); setStatus(""); }} />
    {error && <p className="notice error" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
    <h2 className="section-title">我的作品</h2><WorkSearch value={query} onSearch={q => { setQuery(q); setPage(1); }} />
    <div className="filter-row"><label>作品状态<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">全部状态</option>{Object.entries(statusName).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><button disabled={fetching} onClick={() => setVersion(v => v + 1)}>刷新我的作品</button></div>
    {fetching ? <p role="status">正在加载我的作品…</p> : workError ? <div role="alert" className="notice error">{workError} <button onClick={() => setVersion(v => v + 1)}>重试加载我的作品</button></div> : <><div className="works-grid">{works.items.map(work => <WorkCard key={work.id} work={work}>{work.status !== "deleted" && <div className="action-row"><Link className="button" to={`/account/works/${work.id}/edit`}>{work.status === "rejected" ? "修改并重新投稿" : "编辑作品"}</Link><button className="danger" disabled={busy} onClick={() => void remove(work)}>删除作品</button></div>}</WorkCard>)}</div>{works.items.length === 0 && <div className="empty-state"><p>{query || status ? "没有符合条件的投稿。" : "你的投稿和审核结果会显示在这里。"}</p>{(query || status || page > 1) && <button onClick={() => { setQuery(""); setStatus(""); setPage(1); }}>查看全部投稿</button>}</div>}<Pagination page={page} total={works.total} change={setPage} /></>}
  </>}</CommunityLayout>;
}

export function Privacy() {
  return <CommunityLayout><article className="policy"><p className="eyebrow">版本 {CONSENT}</p><h1>隐私说明与投稿规则</h1>
    <h2>账号与登录记录</h2><p>注册使用用户名和密码。我们保存用户名、密码的加盐哈希、昵称、角色、注册及最近登录时间。为了识别异常登录和追溯管理操作，我们记录登录成功或失败、时间、浏览器信息与经过密钥散列的网络地址标识。总管理员和经授权的全站管理员可查看这些记录及投稿归属；部门管理员仅能查看所负责部门的投稿归属，不能查看全站用户和登录记录。未登录访客的真实身份无法通过本系统识别。</p>
    <h2>作品与公开范围</h2><p>投稿须为原创或已获授权的内容，请勿上传违法、侵权或包含未经同意的个人敏感信息的作品。作品审核通过后，图片、标题、简介和昵称会公开展示。用户名仅供本人和管理人员查看。图片处理会移除 EXIF 定位等元数据。</p>
    <h2>管理权限</h2><p>总管理员可任免管理员、设置管理部门、停用账号并查看管理记录。管理员可在授权范围内审核、退回和删除作品，以及调整分支。删除或退回须填写原因，操作会记录操作者和时间。账号被停用后，其作品暂停公开。</p>
    <h2>保存与删除</h2><p>登录和操作日志默认保留 180 天。作品删除后立即停止展示及访问，文件将在维护任务中清理。删除记录和必要的操作证据按日志期限保留。账号资料保存至注销处理完成，备份中的数据随备份轮换到期清理。你可以在个人中心修改昵称、删除作品，并联系网站运营方申请查阅、更正或注销账号。</p>
    <h2>存储与安全</h2><p>生产服务使用阿里云香港资源存储账号与作品数据。登录状态使用安全 Cookie，不用于广告跟踪。新投稿的文字、分类和图片文件名会按账号保存在当前浏览器，图片文件本身不保存；提交成功或点击“清空草稿”可清除。共用设备使用后请清空草稿。请保护好自己的用户名和密码。</p>
    <h2>联系</h2><p>账号和隐私相关请求请发送至 <a href="mailto:2625148973@qq.com">2625148973@qq.com</a>。</p>
  </article></CommunityLayout>;
}
