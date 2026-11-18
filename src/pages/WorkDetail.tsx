import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, API, dateText, type Work } from "../lib/community";
import { departmentNames, type Department } from "../lib/categories";
import { Lightbox } from "../lib/Lightbox";
import { CommunityLayout } from "./Community";

export default function WorkDetail() {
  const { id } = useParams();
  const [work, setWork] = useState<Work | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  const [light, setLight] = useState(-1), [shared, setShared] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const url = `${window.location.origin}/works/${encodeURIComponent(id || "")}`;
  useEffect(() => {
    let active = true;
    setWork(null); setLoading(true); setLight(-1); setShared(""); setManualCopy(false);
    const update = () => api<Work>(`/works/${encodeURIComponent(id || "")}`).then(data => { if (active) { setWork(data); setError(""); } })
      .catch(e => { if (active) { setWork(null); setLight(-1); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    void update();
    const refresh = () => { if (!document.hidden) void update(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [id, version]);
  useEffect(() => {
    const previous = document.title;
    if (work) document.title = `${work.title} · 青年媒体中心`;
    return () => { document.title = previous; };
  }, [work?.title]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setShared("作品链接已复制，可以分享给朋友了。"); setManualCopy(false); }
    catch { setManualCopy(true); setShared("请选中下方链接复制分享。"); }
  }
  return <CommunityLayout><div className="detail-back"><Link to="/#works">← 首页作品墙</Link><Link to="/community">全部公开作品 ↗</Link></div>
    {loading ? <p role="status">正在打开作品…</p> : !work ? <section className="empty-state"><h1>暂时无法查看这件作品</h1><p role="alert">{error}</p><button onClick={() => setVersion(v => v + 1)}>重新加载</button></section> : <article className="work-detail">
      <header className="work-detail-heading"><p className="eyebrow">{departmentNames[work.category as Department]?.name} / {work.branch}{work.featured && <span className="featured-badge">编辑精选</span>}</p><h1>{work.title}</h1><p className="muted">创作者 · {work.creator_id ? <Link to={`/creators/${work.creator_id}`}>{work.nickname} ↗</Link> : work.nickname}</p><p className="muted">{work.published_at ? `发布于 ${dateText(work.published_at)}` : `投稿于 ${dateText(work.created_at)}`} · {work.images.length} 张作品</p>
        <div className="action-row"><button className="primary" onClick={() => void copy()}>复制作品链接</button><Link className="button" to={`/${work.category}#cat-${encodeURIComponent(work.branch)}`}>浏览这个分支 ↗</Link></div>
        {shared && <p className="notice" role="status">{shared}</p>}{manualCopy && <label>作品分享链接<input value={url} readOnly onFocus={e => e.target.select()} /></label>}
      </header>
      {work.description && <section className="work-story"><h2>作品背后的故事</h2><p>{work.description}</p></section>}
      <div className="work-detail-images">{work.images.map((image, index) => <figure key={image}><button className="detail-image-button" onClick={() => setLight(index)} aria-label={`放大第 ${index + 1} 张作品`}><img src={`${API}/api/images/${image}`} alt={`${work.title} · 第 ${index + 1} 张`} loading={index === 0 ? "eager" : "lazy"} /></button><figcaption>{String(index + 1).padStart(2, "0")} / {String(work.images.length).padStart(2, "0")}</figcaption></figure>)}</div>
      <p className="detail-credit">作品来自 {work.nickname}，转载请先获得作者授权。</p>
      {light >= 0 && <Lightbox items={work.images.map(image => ({ type: "image", src: `${API}/api/images/${image}`, caption: `${work.title} · ${work.nickname}` }))} index={light} onClose={() => setLight(-1)} />}
    </article>}
  </CommunityLayout>;
}
