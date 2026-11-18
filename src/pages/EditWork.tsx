import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, uploadWithProgress, useAuth, type Work } from "../lib/community";
import { useCategories, type Department } from "../lib/categories";
import { ImagePicker, UploadProgress, type PickedImage } from "../components/ImagePicker";
import { CommunityLayout, LoginForm } from "./Community";

export default function EditWork() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { departments } = useCategories();
  const [work, setWork] = useState<Work | null>(null), [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState(""), [description, setDescription] = useState("");
  const [category, setCategory] = useState<Department>("photography"), [branch, setBranch] = useState("");
  const [items, setItems] = useState<PickedImage[]>([]), [rights, setRights] = useState(false);
  const [error, setError] = useState(""), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true; setFetching(true); setWork(null); setError(""); setSaved(false);
    api<Work>(`/my/works/${encodeURIComponent(id || "")}`).then(data => {
      if (!active) return;
      setWork(data); setTitle(data.title); setDescription(data.description); setCategory(data.category as Department); setBranch(data.branch); setItems(data.images.map(id => ({ key: id, id }))); setRights(false);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [id, user?.id, user?.must_change_password]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!work || !items.length || items.length > 6) { setError("请保留 1 至 6 张图片"); return; }
    const data = new FormData();
    data.set("title", title); data.set("description", description); data.set("category", category); data.set("branch", branch); data.set("rights", String(rights)); data.set("revision", String(work.updated_at));
    let count = 0;
    data.set("order", JSON.stringify(items.map(item => { if (item.id) return item.id; data.append("files", item.file!); return `new:${count++}`; })));
    setBusy(true); setProgress(0);
    try { await uploadWithProgress(`/works/${work.id}/revision`, data, setProgress); setSaved(true); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <CommunityLayout>{loading ? <p>正在确认登录状态…</p> : !user ? <LoginForm /> : user.must_change_password ? <Link to="/account">请先修改初始密码</Link> : fetching ? <p role="status">正在加载作品…</p> : saved ? <section className="empty-state"><h1>修改已提交审核</h1><p>作品链接保持不变，审核结果将发送到你的站内通知。</p><Link className="button primary" to="/account">返回我的作品</Link></section> : <>
    <div className="page-heading"><div><p className="eyebrow">让创作更完整</p><h1>编辑作品</h1></div><Link className="button" to="/account">返回我的作品</Link></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {work && <section className="upload-panel"><p className="notice">保存后重新进入待审核。已公开的作品会暂时停止展示并取消精选，审核通过后恢复公开。保存失败时原作品保持不变。</p>{work.reason && <p className="notice">上次处理说明：{work.reason}</p>}
      <form onSubmit={submit}><fieldset disabled={busy} className="edit-work-fields"><label>作品标题<input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} /></label><label>作品介绍<textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <div className="form-columns"><label>投稿部门<select value={category} onChange={e => { setCategory(e.target.value as Department); setBranch(""); }}>{Object.entries(departments).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label><label>作品分支<select required value={branch} onChange={e => setBranch(e.target.value)}><option value="" disabled>选择分支</option>{departments[category].branches.map(name => <option key={name}>{name}</option>)}</select></label></div>
        <ImagePicker items={items} onChange={setItems} disabled={busy} />
        <label className="checkbox-label"><input type="checkbox" required checked={rights} onChange={e => setRights(e.target.checked)} /><span>作品为本人原创或已获授权，同意投稿规则。</span></label>
        <button className="primary" disabled={busy}>{busy ? "正在提交…" : "保存修改并重新提交审核"}</button>
      </fieldset>{busy && <UploadProgress value={progress} />}</form>
    </section>}
  </>}</CommunityLayout>;
}
