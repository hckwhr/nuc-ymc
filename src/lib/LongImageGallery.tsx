import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconChevronLeft, IconChevronRight } from "./icons";
import { ossThumb } from "./img";

/** 长图（推文排版截图）画廊：封面卡只露顶部，点击后在弹层里上下滚动看全文。 */
export function LongImageGallery({ images, accent }: { images: string[]; accent: string }) {
  const [idx, setIdx] = useState(-1);
  const prev = useCallback(() => setIdx((v) => (v - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((v) => (v + 1) % images.length), [images.length]);

  useEffect(() => {
    if (idx < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(-1);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [idx, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setIdx(i)}
            className="group relative block overflow-hidden rounded-xl border border-line bg-surface"
          >
            <div className="aspect-[3/4] w-full overflow-hidden">
              <img
                src={ossThumb(src, 500)}
                alt={`推文 ${i + 1}`}
                loading="lazy"
                className="w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-3 py-2 text-xs text-white">
              <span className="font-medium">推文 {i + 1}</span>
              <span style={{ color: accent }}>长图 · 点击阅读</span>
            </span>
          </button>
        ))}
      </div>

      {idx >= 0 &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-[rgba(18,18,20,0.94)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="推文长图"
          >
            <button
              className="fixed right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              onClick={() => setIdx(-1)}
              aria-label="关闭"
            >
              <IconClose width={22} height={22} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  className="fixed left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:grid"
                  onClick={prev}
                  aria-label="上一张"
                >
                  <IconChevronLeft width={24} height={24} />
                </button>
                <button
                  className="fixed right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:grid"
                  onClick={next}
                  aria-label="下一张"
                >
                  <IconChevronRight width={24} height={24} />
                </button>
              </>
            )}
            <div className="h-full w-full overflow-y-auto overscroll-contain px-4 py-6" onClick={() => setIdx(-1)}>
              <img
                src={images[idx]}
                alt={`推文 ${idx + 1}`}
                className="mx-auto w-full max-w-[440px] rounded-lg bg-white"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="py-5 text-center text-sm text-white/60">
                {idx + 1} / {images.length} · 向下滚动查看全文，点空白处关闭
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
