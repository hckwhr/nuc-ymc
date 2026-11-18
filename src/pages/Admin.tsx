import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, dateText, roleName, useAuth, type Page, type User, type Work } from "../lib/community";
import { DepartmentFilters } from "../components/SubmissionTree";
import { BranchManager } from "../components/BranchManager";
import { CommunityLayout, LoginForm, Pagination, WorkCard } from "./Community";

type Member = User & { work_count: number; login_count: number };
type Login = { id: number; username: string; nickname: string; success: number; reason: string; ip_hash: string; device: string; created_at: number };
type Audit = { id: number; username: string; nickname: string; action: string; target_id: string; detail: string; created_at: number };
type Overview = { users: number; works: number; pending: number; logins: number };
const actions: Record<string, string> = { feature: "设为首页精选", unfeature: "取消首页精选", create_branch: "创建分支", rename_owner: "修改总管理员用户名", password: "修改密码", reset_password: "重置密码", register: "注册", logout: "退出登录", profile: "修改昵称", upload: "上传作品", delete_own: "作者删除", approved: "审核通过", rejected: "退回作品", deleted: "管理员删除", role: "调整权限", disable: "停用账号", enable: "恢复账号" };

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("users"), [page, setPage] = useState(1), [version, setVersion] = useState(0);
  const [category, setCategory] = useState(""), [branch, setBranch] = useState("");
  const [status, setStatus] = useState("pending"), [query, setQuery] = useState(""), [search, setSearch] = useState("");
  const [member, setMember] = useState<Member | null>(null), [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[]>([]), [works, setWorks] = useState<Work[]>([]), [logins, setLogins] = useState<Login[]>([]), [audit, setAudit] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0), [fetching, setFetching] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [decision, setDecision] = useState<{ work: Work; status: string } | null>(null), [reason, setReason] = useState("");
  const authorized = user && !user.must_change_password && user.role !== "user";
  useEffect(() => {
    if (!authorized) return;
    let active = true;
    api<Overview>("/admin/overview").then(data => { if (active) setOverview(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [authorized, version]);
  useEffect(() => {
    if (!authorized || tab === "branches") { setFetching(false); return; }
    let active = true; setFetching(true); setError("");
    const filters = new URLSearchParams({ page: String(page) });
    if (tab === "users") filters.set("q", search);
    if (tab === "works") { filters.set("status", status); filters.set("category", category); filters.set("branch", branch); }
    if (member && (tab === "works" || tab === "logins")) filters.set("user_id", member.id);
    api<Page<Member | Work | Login | Audit>>(`/admin/${tab}?${filters}`).then(data => {
      if (!active) return;
      setTotal(data.total);
      if (tab === "users") setMembers(data.items as Member[]);
      if (tab === "works") setWorks(data.items as Work[]);
      if (tab === "logins") setLogins(data.items as Login[]);
      if (tab === "audit") setAudit(data.items as Audit[]);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [authorized, tab, page, version, search, status, category, branch, member?.id]);
  function navigate(next: string) { setTab(next); setPage(1); setMember(null); }
  function inspect(target: Member, next: string) { setMember(target); setTab(next); setStatus(""); setCategory(""); setBranch(""); setPage(1); }
  async function mutation(path: string, body: object) {
    setBusy(true); setError("");
    try { await api(path, { method: "PATCH", body: JSON.stringify(body) }); setVersion(v => v + 1); return true; }
    catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function changeRole(target: Member) {
    const role = target.role === "admin" ? "user" : "admin";
    if (window.confirm(`将 ${target.username} 设为${roleName[role]}？该用户将需要重新登录。`)) await mutation(`/admin/users/${target.id}/role`, { role });
  }
  async function disable(target: Member) {
    if (window.confirm(`${target.disabled ? "恢复" : "停用"} ${target.username} 的账号？停用后登录失效，其作品暂停公开。`)) await mutation(`/admin/users/${target.id}/disabled`, { disabled: !target.disabled });
  }
  return <CommunityLayout>{loading ? <p>正在检查权限…</p> : !user ? <LoginForm /> : !authorized ? <div className="empty-state"><h1>{user.must_change_password ? "请先修改初始密码" : "需要管理员权限"}</h1><Link to="/account">返回我的作品</Link></div> : <>
    <div className="page-heading"><div><p className="eyebrow">{roleName[user.role]} · {user.username}</p><h1>创作管理</h1><p className="muted">{user.role === "owner" ? "所有注册用户会自动显示在这里，找到用户名即可设置管理员。" : "查看注册用户与投稿，审核作品并记录处理结果。"}</p></div><button disabled={fetching} onClick={() => setVersion(v => v + 1)}>刷新数据</button></div>
    {overview && <div className="overview">{[["注册用户", overview.users], ["在库作品", overview.works], ["待审核", overview.pending], ["近 24 小时登录", overview.logins]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    <nav className="admin-tabs" aria-label="管理功能">{[["works", "作品管理"], ["branches", "部门与分支"], ["users", "注册用户与权限"], ["logins", "登录记录"], ["audit", "操作审计"]].map(([value, label]) => <button key={value} aria-current={tab === value ? "page" : undefined} onClick={() => navigate(value)}>{label}</button>)}</nav>
    {tab === "branches" && <BranchManager />}
    {tab === "works" && <p className="notice">通过审核后，作品会同步显示在首页作品墙、所属部门分支和作品社区。公开作品可设为首页精选（最多 12 件）。退回或删除后停止公开，并自动取消精选；审核结果将通知作者。</p>}
    {member && <div className="member-filter"><span>正在查看 {member.nickname} · {member.username}</span><button onClick={() => { setMember(null); setPage(1); }}>查看全部用户</button></div>}
    {tab === "works" && <div className="filter-row"><label>审核状态 <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已公开</option><option value="rejected">已退回</option><option value="deleted">已删除</option></select></label></div>}
    {tab === "works" && <DepartmentFilters category={category} branch={branch} onChange={(category, branch) => { setCategory(category); setBranch(branch); setPage(1); }} />}
    {tab === "users" && <form className="search-form" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }}><label>搜索用户<input placeholder="用户名或昵称" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} /></label><button>搜索</button></form>}
    {error && <p className="notice error" role="alert">{error}</p>}{fetching ? <p role="status">正在加载…</p> : <>
      {tab === "works" && <div className="works-grid">{works.map(work => <WorkCard work={work} key={work.id}>{work.status !== "deleted" && <div className="action-row">{work.status === "approved" && <button disabled={busy} onClick={() => void mutation(`/admin/works/${work.id}/featured`, { featured: !work.featured })}>{work.featured ? "取消首页精选" : "设为首页精选"}</button>}{work.status !== "approved" && <button disabled={busy} onClick={() => void mutation(`/admin/works/${work.id}`, { status: "approved" })}>通过审核</button>}<button disabled={busy} onClick={() => { setDecision({ work, status: "rejected" }); setReason(""); }}>退回</button><button className="danger" disabled={busy} onClick={() => { setDecision({ work, status: "deleted" }); setReason(""); }}>删除</button></div>}</WorkCard>)}</div>}
      {tab === "users" && <div className="table-scroll"><table><thead><tr><th>注册用户名 / 昵称</th><th>权限 / 状态</th><th>作品 / 登录</th><th>最近登录</th><th>操作</th></tr></thead><tbody>{members.map(target => <tr key={target.id}><td><strong className="member-username">@{target.username}</strong><small>昵称 · {target.nickname}</small><small>注册于 {dateText(target.created_at)}</small></td><td>{roleName[target.role]}<br />{target.disabled ? "已停用" : "正常"}</td><td><button onClick={() => inspect(target, "works")}>{target.work_count} 件作品</button><button onClick={() => inspect(target, "logins")}>{target.login_count} 次登录</button></td><td>{dateText(target.last_login)}</td><td>{user.role === "owner" && target.role !== "owner" && <div className="action-row"><button disabled={busy} onClick={() => void changeRole(target)}>{target.role === "admin" ? "撤销管理员" : "设为管理员"}</button><button disabled={busy} className="danger" onClick={() => void disable(target)}>{target.disabled ? "恢复账号" : "停用账号"}</button></div>}</td></tr>)}</tbody></table></div>}
      {tab === "logins" && <><p className="muted">记录用户名密码登录，成功次数按保留期内统计。网络标识已脱敏。</p><div className="table-scroll"><table><thead><tr><th>用户</th><th>时间</th><th>结果</th><th>浏览器 / 网络标识</th></tr></thead><tbody>{logins.map(entry => <tr key={entry.id}><td>{entry.nickname || "未注册"}<br />{entry.username}</td><td>{dateText(entry.created_at)}</td><td>{entry.success ? "成功" : "失败"}<small>{entry.reason}</small></td><td className="device-cell">{entry.device}<small>{entry.ip_hash.slice(0, 16)}</small></td></tr>)}</tbody></table></div></>}
      {tab === "audit" && <div className="table-scroll"><table><thead><tr><th>操作者</th><th>时间</th><th>操作</th><th>对象 / 详情</th></tr></thead><tbody>{audit.map(entry => <tr key={entry.id}><td>{entry.nickname}<br />{entry.username}</td><td>{dateText(entry.created_at)}</td><td>{actions[entry.action] || entry.action}</td><td className="device-cell">{entry.target_id}<small>{entry.detail}</small></td></tr>)}</tbody></table></div>}
      {tab !== "branches" && <>{total === 0 && !error && <p className="empty-state">暂无符合条件的记录。</p>}<Pagination page={page} total={total} change={setPage} /></>}
    </>}
    {decision && <div className="modal-backdrop"><section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><h2 id="decision-title">{decision.status === "deleted" ? "删除" : "退回"}《{decision.work.title}》</h2><p>原因会展示给作者并记入操作审计。</p><form onSubmit={async e => { e.preventDefault(); if (await mutation(`/admin/works/${decision.work.id}`, { status: decision.status, reason })) setDecision(null); }}><label>处理原因<textarea autoFocus required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>{error && <p className="notice error" role="alert">{error}</p>}<div className="action-row"><button type="button" disabled={busy} onClick={() => setDecision(null)}>取消</button><button className="primary" disabled={busy || !reason.trim()}>确认处理</button></div></form></section></div>}
  </>}</CommunityLayout>;
}
