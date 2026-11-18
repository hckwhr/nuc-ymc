import { site } from "../data/site";
import { photographyImages, designImages } from "../data/media";
import { useCategories } from "../lib/categories";

export function Stats() {
  const { departments, error } = useCategories();
  const published = Object.values(departments).reduce((sum, department) => sum + Object.values(department.counts || {}).reduce((total, count) => total + count, 0), 0);
  const loaded = !error && Object.values(departments).some(department => department.counts !== undefined);
  const stats = [
    { label: "正式部门", value: site.departments.filter(department => !department.internal).length },
    { label: "摄影馆藏图片", value: new Set(photographyImages).size },
    { label: "设计馆藏图片", value: new Set(designImages).size },
    { label: "已审核公开投稿", value: loaded ? published : "—" },
  ];
  return <section id="stats" className="bg-ink py-16 sm:py-20"><div className="mx-auto max-w-6xl px-6">
    <h2 className="mb-10 text-center text-lg text-white">从这里，认识青媒的创作</h2>
    <div className="grid grid-cols-2 gap-10 md:grid-cols-4">{stats.map(stat => <div key={stat.label} className="text-center"><p className="font-display text-4xl text-white sm:text-5xl">{stat.value}</p><p className="mt-3 text-sm text-white/70">{stat.label}</p></div>)}</div>
    <p className="mt-10 text-center text-xs leading-6 text-white/60">馆藏按网站图片目录去重统计，组图中的每张图片分别计数；公开投稿按作品计数。{!loaded && "投稿统计暂未取得。"}</p>
  </div></section>;
}
