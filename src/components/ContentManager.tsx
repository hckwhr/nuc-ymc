import { useEffect, useState } from "react";
import { api } from "../lib/community";
import { contentFields, useSiteContent, type ContentKey, type SiteContent } from "../lib/siteContent";

export function ContentManager() {
  const { refresh } = useSiteContent();
  const [saved, setSaved] = useState<SiteContent | null>(null), [draft, setDraft] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const dirty = !!draft && JSON.stringify(saved?.values) !== JSON.stringify(draft.values);
  async function load() {
    setBusy(true); setError("");
    try { const result = await api<SiteContent>("/site-content"); setSaved(result); setDraft(result); setMessage(""); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  async function publish() {
    if (!draft) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<SiteContent>("/admin/site-content", { method: "PUT", body: JSON.stringify(draft) });
      setSaved(result); setDraft(result); setMessage(`发布成功 · 版本 ${result.revision}。新访客立即可见，已打开的页面将在一分钟内更新。`);
      await refresh().catch(() => {});
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="upload-panel"><h2>网站内容编辑</h2><p className="muted">修改首页简介、中心介绍、部门卡片简介、招新信息和公告。内容按纯文本显示，发布后同步主站；部门专题中的长篇介绍和图片保持独立。</p><p className="notice">切换后台标签或离开页面前请先发布。未发布的修改不会出现在主站。</p>
    <div className="action-row"><button disabled={busy} onClick={() => { if (!dirty || confirm("放弃未发布修改，加载线上最新内容？")) void load(); }}>重新加载线上内容</button><button disabled={!draft} onClick={() => setPreview(value => !value)}>{preview ? "继续编辑" : "预览待发布文字"}</button></div>
    {error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {draft && <form onSubmit={event => { event.preventDefault(); void publish(); }}><fieldset disabled={busy}>
      {(Object.keys(contentFields) as ContentKey[]).map(key => <div key={key} className="my-6">{preview ? <><h3 className="text-sm text-soft">{contentFields[key].label}</h3><p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-line bg-background p-4">{draft.values[key] || "（不显示）"}</p></> : <label>{contentFields[key].label}<textarea value={draft.values[key]} maxLength={contentFields[key].max} rows={key === "center_about" || key === "announcement_body" ? 5 : 3} onChange={event => { setDraft({ ...draft, values: { ...draft.values, [key]: event.target.value } }); setMessage(""); }} /><small>{draft.values[key].length} / {contentFields[key].max}</small></label>}</div>)}
      <div className="action-row"><button className="primary" disabled={!dirty || busy}>{busy ? "正在发布…" : "发布到网站"}</button><span className="muted">{dirty ? "有未发布修改" : `已保存 · 版本 ${saved?.revision}`}</span></div>
    </fieldset></form>}
  </section>;
}
