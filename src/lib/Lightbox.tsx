import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose, IconChevronLeft, IconChevronRight } from "./icons";

export interface LightItem {
  type: "image" | "video";
  src: string;
  poster?: string;
  caption?: string;
}

export function Lightbox({
  items,
  index,
  onClose,
}: {
  items: LightItem[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => setI(index), [index]);

  const prev = useCallback(() => setI((v) => (v - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setI((v) => (v + 1) % items.length), [items.length]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); close.current(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLElement>("button, video[controls]");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [prev, next]);

  const cur = items[i];
  if (!cur) return null;

  return createPortal(
    <div
      ref={dialog}
      className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(18,18,20,0.94)] backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="作品预览"
    >
      <button
        className="absolute z-10 top-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        onClick={onClose}
        aria-label="关闭"
      >
        <IconClose width={22} height={22} />
      </button>

      {items.length > 1 && (
        <>
          <button
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="上一张"
          >
            <IconChevronLeft width={24} height={24} />
          </button>
          <button
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="下一张"
          >
            <IconChevronRight width={24} height={24} />
          </button>
        </>
      )}

      <figure className="max-h-[86vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()} onTouchStart={e => {
        touch.current = cur.type === "image" && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }} onTouchMove={e => { if (e.touches.length !== 1) touch.current = null; }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={e => {
        const start = touch.current; touch.current = null;
        if (!start || !e.changedTouches.length || items.length < 2) return;
        const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) next(); else prev(); }
      }}>
        {cur.type === "video" ? (
          <video
            src={cur.src}
            poster={cur.poster}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-[92vw] rounded-xl"
          />
        ) : (
          <img src={cur.src} alt={cur.caption || "作品"} className="max-h-[80vh] max-w-[92vw] rounded-xl object-contain" />
        )}
        {(cur.caption || items.length > 1) && (
          <figcaption className="mt-3 text-center text-sm text-white/70">
            {cur.caption} {items.length > 1 && <span className="ml-2 text-white/40">{i + 1} / {items.length}</span>}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body
  );
}
