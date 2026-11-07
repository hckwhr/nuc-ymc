import { useState } from "react";
import type { PhotoCategory } from "../data/photographyCats";
import { Reveal } from "./Reveal";
import { Lightbox, type LightItem } from "./Lightbox";
import { ossThumb } from "./img";

/** 分类图库：每个分类一段，从上到下堆叠，点击放大。 */
export function CategoryGallery({
  categories,
  accent,
}: {
  categories: PhotoCategory[];
  accent: string;
}) {
  const [light, setLight] = useState<{ items: LightItem[]; index: number } | null>(null);

  return (
    <>
      {categories.map((cat) => (
        <div key={cat.name || "all"} id={cat.name ? `cat-${cat.name}` : undefined} className="mb-16 scroll-mt-24 last:mb-0">
          {cat.name && (
            <Reveal>
              <div className="mb-6 flex items-center gap-4">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
                <h3 className="font-display text-2xl text-ink sm:text-3xl">{cat.name}</h3>
                <span className="h-px flex-1 bg-line" />
                <span className="shrink-0 text-sm text-soft">{cat.images.length} 张</span>
              </div>
            </Reveal>
          )}
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
            {cat.images.map((src, i) => (
              <button
                key={src}
                onClick={() =>
                  setLight({
                    // 点开看大图用原图（1920px，零二次压缩，最佳质量）
                    items: cat.images.map((s) => ({ type: "image", src: s, caption: cat.name })),
                    index: i,
                  })
                }
                className="group block w-full overflow-hidden rounded-xl border border-line bg-surface"
              >
                <img
                  src={ossThumb(src, 700)}
                  alt={`${cat.name} ${i + 1}`}
                  loading="lazy"
                  className="w-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
        </div>
      ))}

      {light && <Lightbox items={light.items} index={light.index} onClose={() => setLight(null)} />}
    </>
  );
}
