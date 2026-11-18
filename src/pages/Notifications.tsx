import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, dateText, useAuth, type Page } from "../lib/community";
import { CommunityLayout, LoginForm, Pagination } from "./Community";

type Notice = { id: number; work_id: string; title: string; status: string; reason: string; created_at: number; read_at: number | null };
const labels: Record<string, string> = { approved: "作品审核通过", rejected: "作品已退回", deleted: "作品已被管理员删除" };
export default function Notifications() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Page<Notice>>({ items: [], total: 0, page: 1 });
  const [page, setPage] = useState(1), [version, setVersion] = useState(0);
  const [error, setError] = useState(""), [fetching, setFetching] = useState(true), [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true; setFetching(true);
    const update = () => api<Page<Notice>>(`/notifications?page=${page}`).then(value => { if (active) { setData(value); setError(""); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setFetching(false); });
    void update();
    const refresh = () => { if (!document.hidden) void update(); };
    const timer = window.setInterval(refresh, 60000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [user?.id, user?.must_change_password, page, version]);
  async function read(id: number) {
    setBusy(id); setError("");
    try { await api(`/notifications/${id}/read`, { method: "PATCH" }); setVersion(v => v + 1); window.dispatchEvent(new Event("notifications-read")); }
    catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }
  return <CommunityLayout>{loading ? <p>正在确认登录状态…</p> : !user ? <LoginForm /> : user.must_change_password ? <Link to="/account">请先修改初始密码</Link> : <>
    <div className="page-heading"><div><p className="eyebrow">创作有回音</p><h1>我的通知</h1><p className="muted">这里记录本次功能上线后的审核结果与处理原因，保留 180 天。</p></div><button onClick={() => setVersion(v => v + 1)} disabled={fetching}>刷新通知</button></div>
    {error && <p role="alert" className="notice error">{error}</p>}
    {fetching ? <p role="status">正在加载通知…</p> : <><div className="notification-list">{data.items.map(item => <article key={item.id} className={`notification-card ${item.read_at ? "" : "unread"}`}><div className="notification-heading"><span className="eyebrow">{labels[item.status] || "作品状态更新"}</span><span className="muted">{item.read_at ? "已读" : "未读"}</span></div><h2>《{item.title}》</h2><p>{item.status === "approved" ? "审核已通过，可通过作品链接分享你的创作。" : item.reason}</p><small>{dateText(item.created_at)}</small><div className="action-row">{item.status === "approved" && <Link className="button primary" to={`/works/${item.work_id}`}>查看作品 ↗</Link>}<Link className="button" to="/account">我的作品</Link>{!item.read_at && <button disabled={busy !== null} onClick={() => void read(item.id)}>{busy === item.id ? "正在保存…" : "标为已读"}</button>}</div></article>)}</div>{!data.total && !error && <p className="empty-state">还没有审核通知。作品提交后，处理结果会显示在这里。</p>}<Pagination page={page} total={data.total} change={setPage} /></>}
  </>}</CommunityLayout>;
}
