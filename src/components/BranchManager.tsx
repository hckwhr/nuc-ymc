import { useState, type FormEvent } from "react";
import { api } from "../lib/community";
import { useCategories, type Department } from "../lib/categories";

export function BranchManager() {
  const { departments, refresh, error: loadError } = useCategories();
  const [category, setCategory] = useState<Department>("photography");
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await api("/admin/branches", { method: "POST", body: JSON.stringify({ category, name: name.trim() }) });
      setMessage(`已创建“${name.trim()}”，投稿选择和${departments[category].name}页面会同步更新。`); setName("");
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="upload-panel branch-manager"><h2>创建作品分支</h2><p className="muted">总管理员和管理员可添加分支。新分支会出现在投稿树和部门素材库；作品审核通过后同时展示在首页、部门页面与作品社区。</p>
    <form onSubmit={submit}><fieldset disabled={busy} className="branch-create-fields"><label>所属部门<select value={category} onChange={e => { setCategory(e.target.value as Department); setError(""); setMessage(""); }}>{Object.entries(departments).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label><label>新分支名称<input value={name} onChange={e => setName(e.target.value)} maxLength={30} required placeholder="例如：毕业季、校园建筑" /></label><button className="primary" disabled={busy || !name.trim()}>{busy ? "正在创建…" : "创建分支"}</button></fieldset></form>
    {(error || loadError) && <p role="alert" className="notice error">{error || loadError}</p>}{message && <p role="status" className="notice">{message}</p>}
    <h3>当前分支 · {departments[category].name}</h3><div className="branch-list">{departments[category].branches.map(branch => <a key={branch} href={`/${category}#cat-${encodeURIComponent(branch)}`} target="_blank" rel="noreferrer">{branch}<span>{departments[category].counts?.[branch] || 0} 件公开投稿 ↗</span></a>)}</div>
  </section>;
}
