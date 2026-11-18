import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, API, type Page, type Work } from "../lib/community";
import { departmentNames, useCategories, type Department } from "../lib/categories";
import type { PhotoCategory } from "../data/photographyCats";

export function useDepartmentGallery(category: Department, original: PhotoCategory[]) {
  const { departments } = useCategories();
  return [...new Set([...departments[category].branches, ...original.map(item => item.name)])].map(name => ({
    name, images: original.find(item => item.name === name)?.images || [],
  }));
}

/** Uses the same moderated public feed as the community; no copied publication state. */
export function PublishedWorks({ category = "", branch = "", featured = false }: { category?: string; branch?: string; featured?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(1), [version, setVersion] = useState(0);
  const [data, setData] = useState<Page<Work>>({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "300px" });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setPage(1); }, [category, branch, featured]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const update = () => {
      const query = new URLSearchParams({ category, branch, page: String(page), featured: String(featured) });
      return api<Page<Work>>(`/works?${query}`).then(value => { if (active) { setData(value); setError(""); } })
        .catch(() => { if (active) { setData({ items: [], total: 0, page }); setError("公开投稿暂时无法加载，请重试。"); } })
        .finally(() => { if (active) setLoading(false); });
    };
    setLoading(true); void update();
    const refresh = () => { if (!document.hidden) void update(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [category, branch, featured, page, version, visible]);
  return <div ref={ref} className="published-works" aria-label={featured ? "编辑精选" : branch ? `${branch}公开投稿` : "最新公开投稿"}>
    {error ? <p role="alert" className="mb-5 text-sm text-soft">{error} <button className="underline" onClick={() => setVersion(v => v + 1)}>重新加载</button></p> : loading ? <p role="status" className="mb-5 text-sm text-soft">正在加载公开投稿…</p> : <>
      {featured && data.total > 0 && <h3 className="mb-6 text-2xl text-ink">编辑精选<span className="ml-3 text-sm text-soft">值得驻足的创作</span></h3>}
      {data.total > 0 && !featured && <p className="mb-4 text-sm text-soft">{branch ? "这个分支" : "最新创作"} · {data.total} 件公开投稿</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map(work => <article key={work.id} className="overflow-hidden rounded-2xl border border-line bg-surface" data-work-id={work.id}>
          <Link className="group block w-full" aria-label={`查看 ${work.title}`} to={`/works/${work.id}`}>
            {work.images[0] && <img src={`${API}/api/images/${work.images[0]}`} alt={work.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
          </Link>
          <div className="p-5"><p className="text-xs text-soft">{departmentNames[work.category as Department]?.name} · {work.branch} · {work.images.length} 张</p><h4 className="mt-2 break-words text-lg font-medium text-ink"><Link to={`/works/${work.id}`}>{work.title}</Link></h4><p className="mt-2 break-words text-sm text-soft">{work.nickname}</p>{work.description && <p className="mt-3 line-clamp-3 break-words text-sm text-soft">{work.description}</p>}</div>
        </article>)}
      </div>
      {data.total === 0 && !featured && <p className="mb-5 text-sm text-soft">这个位置等待你的新作品。<Link to="/account" className="ml-2 underline underline-offset-4">去投稿 ↗</Link></p>}
      {data.total > 24 && <div className="my-6 flex items-center justify-end gap-4 text-sm"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">上一页</button><span>第 {page} 页</span><button disabled={page * 24 >= data.total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">下一页</button></div>}
    </>}
  </div>;
}
