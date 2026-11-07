import { useState } from "react";
import { Link } from "react-router-dom";
import { photographyImages, designImages } from "../data/media";
import { Reveal } from "../lib/Reveal";
import { SectionHead } from "./SectionHead";
import { Lightbox, type LightItem } from "../lib/Lightbox";
import { IconArrow } from "../lib/icons";
import { ossThumb } from "../lib/img";

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

  return (
    <section id="works" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <SectionHead
        kicker="Showcase"
        title={<>作品<em className="not-italic text-sky">墙</em></>}
        sub="这里是我们最能打的瞬间——摄影与设计精选。"
      />

      <Reveal>
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {CURATED.map((w, i) => (
            <button
              key={w.src}
              onClick={() => setLight(i)}
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

      <div className="mt-12 flex flex-wrap justify-center gap-4">
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
