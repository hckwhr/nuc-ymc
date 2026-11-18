import { useState } from "react";
import { Link } from "react-router-dom";
import { photographyImages, designImages } from "../data/media";
import { Reveal } from "../lib/Reveal";
import { SectionHead } from "./SectionHead";
import { Lightbox, type LightItem } from "../lib/Lightbox";
import { IconArrow } from "../lib/icons";
import { ossThumb } from "../lib/img";
import { PublishedWorks } from "./PublishedWorks";

// 主站精选：摄影 + 设计交叉混合
const CURATED: LightItem[] = (() => {
  const photos = photographyImages.slice(0, 22).map((src) => ({ type: "image" as const, src, caption: "摄影部" }));
  const designs = designImages.slice(0, 14).map((src) => ({ type: "image" as const, src, caption: "设计部" }));
  const out: LightItem[] = [];
  const max = Math.max(photos.length, designs.length);
  for (let i = 0; i < max; i++) {
    if (photos[i]) out.push(photos[i]);
    if (designs[i]) out.push(designs[i]);
  }
  return out;
})();

export function Works() {
  const [light, setLight] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [feed, setFeed] = useState<"latest" | "featured">("latest");

  return (
    <section id="works" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <SectionHead
        kicker="Showcase"
        title={<>作品<em className="not-italic text-sky">墙</em></>}
        sub="摄影、设计与抖音部的共同创作，审核通过的新作品会在这里与你见面。"
      />

      <div className="mb-6 flex flex-wrap gap-3" role="group" aria-label="首页作品筛选">{[["latest", "最新投稿"], ["featured", "编辑精选"]].map(([value, label]) => <button key={value} type="button" aria-pressed={feed === value} onClick={() => setFeed(value as "latest" | "featured")} className={`rounded-full border border-line px-5 py-3 text-sm ${feed === value ? "bg-ink text-white" : "bg-surface text-ink"}`}>{label}</button>)}<Link className="rounded-full border border-line px-5 py-3 text-sm text-ink" to="/account">我也来投稿 ↗</Link></div>
      <div className="mb-14"><PublishedWorks key={feed} featured={feed === "featured"} previewLimit={6} /></div>
      <h3 className="mb-6 text-xl text-ink">馆藏精选</h3>
      <Reveal>
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {CURATED.slice(0, expanded ? undefined : 12).map((w, i) => (
            <button
              key={w.src}
              onClick={() => setLight(i)}
              aria-label={`查看${w.caption}馆藏图片 ${i + 1}`}
              className="group relative block w-full overflow-hidden rounded-xl border border-line bg-surface"
            >
              <img
                src={ossThumb(w.src, 700)}
                alt={w.caption}
                loading="lazy"
                className="w-full transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 text-left text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {w.caption}
              </span>
            </button>
          ))}
        </div>
      </Reveal>
      {CURATED.length > 12 && <div className="mt-6 text-center"><button className="rounded-full border border-line px-6 py-3 text-sm text-ink" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "收起馆藏" : `展开更多馆藏 · 共 ${CURATED.length} 张`}</button></div>}

      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link to="/douyin#gallery" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink">抖音部全部作品 <IconArrow width={16} height={16} /></Link>
        <Link to="/community" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-white">作品社区 / 上传作品 <IconArrow width={16} height={16} /></Link>
        <Link
          to="/photography"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-sky hover:text-sky"
        >
          摄影部全部作品 <IconArrow width={16} height={16} />
        </Link>
        <Link
          to="/design"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-coral hover:text-coral"
        >
          设计部全部作品 <IconArrow width={16} height={16} />
        </Link>
      </div>

      {light >= 0 && (
        <Lightbox items={CURATED} index={light} onClose={() => setLight(-1)} />
      )}
    </section>
  );
}
