import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type Page, type Work } from "../lib/community";
import { departmentNames } from "../lib/categories";
import { CommunityLayout, Pagination, WorkCard } from "./Community";

type CreatorProfile = { id: string; nickname: string; counts: Record<string, number>; works: Page<Work> };

export default function Creator() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const raw = Number(params.get("page") || 1), page = Number.isInteger(raw) && raw > 0 && raw <= 100000 ? raw : 1;
  const [profile, setProfile] = useState<CreatorProfile | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [version, setVersion] = useState(0), [copied, setCopied] = useState("");
  useEffect(() => {
    let active = true; setLoading(true); setProfile(null); setError(""); setCopied("");
    const update = () => api<CreatorProfile>(`/creators/${encodeURIComponent(id || "")}?${new URLSearchParams({ category, page: String(page) })}`)
      .then(data => { if (active) { setProfile(data); setError(""); } })
      .catch(e => { if (active) { setProfile(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    void update();
    const refresh = () => { if (!document.hidden) void update(); };
    const timer = window.setInterval(refresh, 60000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [id, page, category, version]);
  useEffect(() => {
    const previous = document.title;
    if (profile) document.title = `${profile.nickname}的作品集 · 青年媒体中心`;
    return () => { document.title = previous; };
  }, [profile?.nickname]);
  return <CommunityLayout><div className="detail-back"><Link to="/community">← 作品社区</Link><Link to="/account">投稿我的作品 ↗</Link></div>
    {loading ? <p role="status">正在打开创作者主页…</p> : !profile ? <section className="empty-state"><h1>暂时无法查看这位创作者</h1><p role="alert">{error}</p><button onClick={() => setVersion(v => v + 1)}>重新加载</button></section> : <>
      <header className="creator-heading"><span className="creator-mark" aria-hidden="true">{Array.from(profile.nickname)[0]}</span><div><p className="eyebrow">校园创作者</p><h1>{profile.nickname}的作品集</h1><p>已公开 {Object.values(profile.counts).reduce((sum, count) => sum + count, 0)} 件作品 · 记录灵感与日常</p></div></header>
      <div className="action-row"><button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied("主页链接已复制。"); } catch { setCopied("请复制浏览器地址栏中的链接分享。"); } }}>复制主页链接</button></div>{copied && <p role="status" className="notice">{copied}</p>}
      <nav className="creator-filters" aria-label="创作者作品分类">{[["", "全部"], ...Object.entries(departmentNames).map(([key, value]) => [key, value.name])].map(([key, name]) => <button key={key} aria-pressed={category === key} onClick={() => setParams(key ? { category: key } : {})}>{name}{key ? ` · ${profile.counts[key] || 0}` : ""}</button>)}</nav>
      <div className="works-grid">{profile.works.items.map(work => <WorkCard key={work.id} work={work} />)}</div>
      {!profile.works.items.length && <div className="empty-state"><p>这里暂时没有公开作品。</p><button onClick={() => setParams({})}>查看全部作品</button></div>}
      <Pagination page={page} total={profile.works.total} change={next => setParams({ ...(category ? { category } : {}), page: String(next) })} />
    </>}
  </CommunityLayout>;
}
