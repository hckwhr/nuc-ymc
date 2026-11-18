import { useEffect, useState } from "react";
import { api, dateText, roleName, type Page, type User } from "../lib/community";

export type Member = User & { study_count: number; work_count: number; login_count: number };
export type Overview = { study_pending?: number; users: number; works: number; pending: number; logins: number | null };

export function AdminDashboard({ overview, scoped, version, open, inspect }: {
  overview: Overview | null; scoped: boolean; version: number;
  open: (tab: string) => void; inspect: (member: Member, tab: string) => void;
}) {
  const [recent, setRecent] = useState<Member[]>([]), [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (scoped) return;
    let active = true; setLoading(true); setError("");
    api<Page<Member>>("/admin/users?page=1").then(data => { if (active) setRecent(data.items.slice(0, 6)); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scoped, version]);
  return <section aria-labelledby="dashboard-heading"><h2 id="dashboard-heading">管理工作台</h2><p className="muted">先处理待办，再了解最近加入的同学。</p>
    <div className="admin-tasks">
      <button onClick={() => open("works")}><span>{scoped ? "本部门待审核作品" : "待审核作品"}</span><strong>{overview?.pending ?? "—"}</strong><small>查看投稿并处理 →</small></button>
      {!scoped && <><button onClick={() => open("study")}><span>待审核学习资料</span><strong>{overview?.study_pending ?? "—"}</strong><small>查看资料并处理 →</small></button><button onClick={() => open("users")}><span>注册用户与权限</span><strong>{overview?.users ?? "—"}</strong><small>查看用户与管理范围 →</small></button></>}
    </div>
    {overview && overview.pending === 0 && (scoped || overview.study_pending === 0) && <p className="notice">当前没有待审核投稿。</p>}
    {!scoped && <section className="upload-panel"><div className="page-heading"><div><h2>最近注册</h2><p className="muted">按注册时间显示最近 6 位用户。</p></div><button onClick={() => open("users")}>查看全部用户</button></div>
      {loading ? <p role="status">正在加载注册用户…</p> : error ? <p role="alert" className="notice error">{error}，请点击顶部“刷新数据”重试。</p> : recent.length ? <div className="recent-members">{recent.map(member => <button key={member.id} onClick={() => inspect(member, "works")}><strong>@{member.username}</strong><span>{member.nickname} · {roleName[member.role]}{member.disabled ? " · 已停用" : ""}</span><small>注册于 {dateText(member.created_at)}</small><small>{member.work_count} 件作品 · {member.study_count} 份资料</small><span>查看用户详情 →</span></button>)}</div> : <p>暂无注册用户。</p>}
    </section>}
  </section>;
}
