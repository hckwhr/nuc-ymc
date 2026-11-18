import { useState, type FormEvent } from "react";
import { api, useAuth } from "../lib/community";
import { useCategories, type Department } from "../lib/categories";

export function BranchManager() {
  const { user } = useAuth();
  const { departments, refresh, error: loadError } = useCategories();
  const allowed = (Object.keys(departments) as Department[]).filter(key => !user?.department || user.role === "owner" || user.department === key);
  const [category, setCategory] = useState<Department>(allowed[0]);
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{ name: string; action: "rename" | "merge" } | null>(null), [target, setTarget] = useState("");
  const branches = departments[category].branches;
  async function mutate(path: string, body: object, success: string, method = "PATCH") {
    setBusy(true); setError(""); setMessage("");
    try { await api(path, { method, body: JSON.stringify(body) }); setMessage(success); setEditing(null); await refresh(); return true; }
    catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await mutate("/admin/branches", { category, name: name.trim() }, `已创建“${name.trim()}”，投稿和部门页面已同步。`, "POST")) setName("");
  }
  function move(index: number, offset: number) {
    const names = [...branches]; [names[index], names[index + offset]] = [names[index + offset], names[index]];
    void mutate("/admin/branches/order", { category, names }, "分支顺序已更新。");
  }
  return <section className="upload-panel branch-manager"><h2>部门分支管理</h2><p className="muted">新增、排序、改名或合并分支。改名与合并同步更新投稿及馆藏分组，保留作品链接、审核状态与图片。</p>
    <form onSubmit={submit}><fieldset disabled={busy} className="branch-create-fields"><label>所属部门<select value={category} onChange={e => { setCategory(e.target.value as Department); setError(""); setMessage(""); setEditing(null); }}>{allowed.map(key => <option key={key} value={key}>{departments[key].name}</option>)}</select></label><label>新分支名称<input value={name} onChange={e => setName(e.target.value)} maxLength={30} required placeholder="例如：毕业季、校园建筑" /></label><button className="primary" disabled={busy || !name.trim()}>{busy ? "正在保存…" : "创建分支"}</button></fieldset></form>
    {(error || loadError) && <p role="alert" className="notice error">{error || loadError}</p>}{message && <p role="status" className="notice">{message}</p>}
    <h3>当前分支 · {departments[category].name}</h3><div className="managed-branches">{branches.map((branch, index) => <div className="managed-branch" key={branch}><a href={`/${category}#cat-${encodeURIComponent(branch)}`} target="_blank" rel="noreferrer"><strong>{branch}</strong><small>{departments[category].counts?.[branch] || 0} 件公开投稿 ↗</small></a><div className="action-row"><button disabled={busy || index === 0} aria-label={`${branch}上移`} onClick={() => move(index, -1)}>↑</button><button disabled={busy || index === branches.length - 1} aria-label={`${branch}下移`} onClick={() => move(index, 1)}>↓</button><button disabled={busy} onClick={() => { setEditing({ name: branch, action: "rename" }); setTarget(branch); }}>改名</button><button disabled={busy || branches.length < 2} onClick={() => { setEditing({ name: branch, action: "merge" }); setTarget(""); }}>合并到…</button></div></div>)}</div>
    {editing && <section className="branch-change-panel"><h3>{editing.action === "rename" ? "重命名" : "合并"}“{editing.name}”</h3><p>影响该分支全部投稿（含待审核、退回及历史记录）和馆藏图片分组。已有作品不会被删除。</p><form onSubmit={e => {
      e.preventDefault();
      if (editing.action === "merge" && !window.confirm(`将“${editing.name}”全部内容合并到“${target}”？原分支将从选择列表移除，内容保留在目标分支。`)) return;
      void mutate(`/admin/branches/${editing.action}`, { category, name: editing.name, target: target.trim() }, editing.action === "rename" ? "分支已改名，内容与旧链接已同步。" : "分支已合并，所有作品完整保留。");
    }}><label>{editing.action === "rename" ? "新名称" : "目标分支"}{editing.action === "rename" ? <input required maxLength={30} value={target} onChange={e => setTarget(e.target.value)} /> : <select required value={target} onChange={e => setTarget(e.target.value)}><option value="" disabled>选择同部门目标分支</option>{branches.filter(branch => branch !== editing.name).map(branch => <option key={branch}>{branch}</option>)}</select>}</label><div className="action-row"><button type="button" disabled={busy} onClick={() => setEditing(null)}>取消</button><button className="primary" disabled={busy || !target.trim() || target.trim() === editing.name}>确认{editing.action === "rename" ? "改名" : "合并"}</button></div></form></section>}
  </section>;
}
