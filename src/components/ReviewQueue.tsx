import { useEffect, useState } from "react";
import { api, API, dateText, statusName, type Work, type Page } from "../lib/community";
import { Lightbox } from "../lib/Lightbox";

export function ReviewQueue({ filters, onClose }: { filters: string; onClose: () => void }) {
  const [work, setWork] = useState<Work | null>(null), [remaining, setRemaining] = useState(0);
  const [version, setVersion] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [reason, setReason] = useState("");
  const [history, setHistory] = useState<Work[]>([]), [historyError, setHistoryError] = useState("");
  const [light, setLight] = useState(-1);
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setWork(null); setReason(""); setLight(-1); setHistory([]); setHistoryError("");
    const query = new URLSearchParams(filters); query.set("status", "pending"); query.set("page", "1");
    api<Page<Work>>(`/admin/works?${query}`).then(async data => {
      if (!active) return;
      setRemaining(data.total); const next = data.items[0]; setWork(next || null);
      if (next?.user_id) {
        try {
          const past = await api<Page<Work>>(`/admin/works?${new URLSearchParams({ user_id: next.user_id })}`);
          if (active) setHistory(past.items.filter(item => item.id !== next.id).slice(0, 23));
        } catch { if (active) setHistoryError("历史投稿暂时无法加载，可刷新重试。"); }
      }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, version]);
  async function decide(status: "approved" | "rejected") {
    if (!work) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`/admin/works/${work.id}`, { method: "PATCH", body: JSON.stringify({ status, reason: status === "rejected" ? reason : "", revision: work.updated_at }) });
      setMessage(`《${work.title}》已${status === "approved" ? "通过" : "退回"}，已通知作者。`); setVersion(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="review-queue" aria-label="连续审核"><div className="page-heading"><div><h2>连续审核</h2><p>按当前部门、分支、作者和搜索条件，逐件处理待审核投稿。</p></div><button disabled={busy} onClick={onClose}>返回作品列表</button></div>
    {message && <p role="status" className="notice">{message}</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <button disabled={busy || loading} onClick={() => setVersion(v => v + 1)}>刷新待审核作品</button>
    {loading ? <p role="status">正在加载待审核作品…</p> : work ? <>
      <p className="eyebrow">当前筛选还有 {remaining} 件待审核</p><h2>{work.title}</h2><p>{work.nickname} · @{work.username} · {dateText(work.created_at)}</p><p>{work.branch} · {work.images.length} 张</p><p>{work.description}</p>
      <div className="review-images">{work.images.map((id, index) => <button key={id} aria-label={`审核大图 ${index + 1}`} onClick={() => setLight(index)}><img src={`${API}/api/images/${id}`} alt={`${work.title} ${index + 1}`} /></button>)}</div>
      <details><summary>作者近期投稿（权限范围内，最多 23 件）</summary>{historyError ? <p role="alert">{historyError}</p> : history.length ? history.map(item => <p key={item.id}>{item.title} · {statusName[item.status]} · {dateText(item.created_at)}</p>) : <p>暂无其他近期投稿。</p>}</details>
      <form onSubmit={e => { e.preventDefault(); void decide("rejected"); }}><fieldset disabled={busy || !!error}><label>退回原因<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="退回时必填，作者将收到这段说明" /></label><div className="action-row">{["图片不够清晰，请更换原图", "分类不准确，请调整部门或分支", "请补充作品说明或授权信息"].map(text => <button type="button" key={text} onClick={() => setReason(text)}>{text}</button>)}</div><div className="action-row"><button type="button" className="primary" onClick={() => void decide("approved")}>通过并审核下一件</button><button className="danger" disabled={!reason.trim()}>退回并审核下一件</button></div></fieldset></form>
    </> : !error && <p className="empty-state">当前筛选下的待审核作品已处理完。</p>}
    {work && light >= 0 && <Lightbox items={work.images.map(id => ({ type: "image", src: `${API}/api/images/${id}`, caption: work.title }))} index={light} onClose={() => setLight(-1)} />}
  </section>;
}
