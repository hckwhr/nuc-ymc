import { useEffect, useRef } from "react";

/**
 * Hero 视频背景：自定义淡入淡出无缝循环。
 * - 开头 0.6s 淡入（opacity 0→1）
 * - 结尾 0.6s 淡出（opacity 1→0）
 * - ended 时置 0，等 100ms 重置 currentTime 再 play()
 * 直接改 DOM style.opacity（不走 React state，避免 60fps 重渲染）。
 */
export function useFadeLoopVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FADE = 0.6;
    let raf = 0;

    v.style.opacity = "0";

    const loop = () => {
      const d = v.duration || 0;
      const t = v.currentTime;
      if (d > 0) {
        let o = 1;
        if (t < FADE) o = t / FADE;
        else if (t > d - FADE) o = Math.max(0, (d - t) / FADE);
        v.style.opacity = String(o);
      }
      raf = requestAnimationFrame(loop);
    };

    const onEnded = () => {
      v.style.opacity = "0";
      window.setTimeout(() => {
        v.currentTime = 0;
        v.play().catch(() => {});
      }, 100);
    };

    const tryPlay = () => v.play().catch(() => {});

    v.addEventListener("ended", onEnded);
    v.addEventListener("loadeddata", tryPlay);
    tryPlay();

    if (reduce) {
      v.style.opacity = "1";
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("loadeddata", tryPlay);
    };
  }, []);

  return videoRef;
}
