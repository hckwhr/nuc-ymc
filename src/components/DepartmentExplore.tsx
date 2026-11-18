import { Link, useLocation } from "react-router-dom";
import { site } from "../data/site";

export function DepartmentExplore() {
  const { pathname } = useLocation();
  const current = site.departments.find(department => !department.internal && department.link === pathname);
  if (!current) return null;
  return <section aria-label="继续了解青媒" className="mx-auto max-w-7xl px-6 py-12">
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs tracking-widest text-soft">探索青年媒体中心</p><h2 className="mt-2 text-2xl text-ink">认识{current.name}，也看看其他伙伴</h2></div><Link to="/#departments" className="rounded-full border border-line px-5 py-3 text-sm text-ink">返回主站部门展示 ↗</Link></div>
      <nav aria-label="部门切换" className="mt-6 flex flex-wrap gap-3">{site.departments.filter(department => !department.internal && department.link).map(department => <Link key={department.key} to={department.link!} aria-current={department === current ? "page" : undefined} className="rounded-full border px-4 py-2 text-sm transition-colors hover:bg-background" style={{borderColor: department.accent + "66", color: "#242424", background: department === current ? department.accent + "22" : undefined}}>{department.name}</Link>)}</nav>
      <div className="mt-6 flex flex-wrap gap-5 border-t border-line pt-5 text-sm text-soft"><Link to="/community">浏览同学作品 ↗</Link><Link to="/account">进入创作空间 ↗</Link><Link to="/#recruit">了解招新与联系 ↗</Link></div>
    </div>
  </section>;
}
