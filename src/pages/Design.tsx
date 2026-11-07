import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { designCategories } from "../data/designCats";
import { site } from "../data/site";
import { CategoryGallery } from "../lib/CategoryGallery";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { ossThumb } from "../lib/img";
// 设计部专用字体：Lithos 参考用 Playfair Display 斜体 + Inter，自托管拉丁子集（不走 Google，国内快）
import "@fontsource/playfair-display/latin-400-italic.css";
import "@fontsource/playfair-display/latin-500-italic.css";
import "@fontsource/playfair-display/latin-600-italic.css";

const ACCENT = "#FF7A59"; // 设计部点缀色（珊瑚，替代 Lithos 的 #e8702a）
const SPOTLIGHT_R = 260; // 光标聚光半径（px）
const STORY = site.departments.find((d) => d.key === "design")?.story ?? "";
const PLAYFAIR = { fontFamily: "'Playfair Display', 'Instrument Serif', Georgia, serif" } as const;
const INTER = {
  fontFamily: "'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
} as const;

// Hero 光标聚光揭示用的两张设计作品（想换就改这两行）
// 底图：汉语言文化大赛门票（藏青 + 烫金，沉稳典雅）
const BG_IMAGE_1 = ossThumb("/assets/design/c2/d05.jpg", 1600, 82);
// 揭示图：部门介绍海报（暗色全息，光标划过时透出另一层设计）
const BG_IMAGE_2 = ossThumb("/assets/design/c2/d17.jpg", 1600, 82);

/** 聚光揭示层：用画布画一个软边圆形渐变作为遮罩，只在光标周围透出第二张图。 */
function RevealLayer({ image, cursorX, cursorY }: { image: string; cursorX: number; cursorY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  // 画布尺寸跟随窗口
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // 光标变化时重绘遮罩
  useEffect(() => {
    const c = canvasRef.current;
    const el = revealRef.current;
    if (!c || !el) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const g = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, SPOTLIGHT_R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.75)");
    g.addColorStop(0.75, "rgba(255,255,255,0.4)");
    g.addColorStop(0.88, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2);
    ctx.fill();
    const url = c.toDataURL();
    el.style.webkitMaskImage = `url(${url})`;
    el.style.maskImage = `url(${url})`;
    el.style.webkitMaskSize = "100% 100%";
    el.style.maskSize = "100% 100%";
  }, [cursorX, cursorY]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" style={{ display: "none" }} />
      <div
        ref={revealRef}
        className="pointer-events-none absolute inset-0 z-30 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  );
}

/** 顶部导航（绝对定位，仅覆盖 Hero；滚到下方浅色素材库时自然离开视野） */
function HeroNav() {
  const items = [
    { label: "作品", href: "#gallery", active: true },
    { label: "门票", href: "#cat-门票设计" },
    { label: "海报", href: "#cat-海报" },
    { label: "关于", href: "#about" },
  ];
  return (
    <nav className="absolute left-0 right-0 top-0 z-[60] flex items-center justify-between p-4 sm:p-5">
      {/* 左：logo + 品牌 */}
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 256 256" width={26} height={26} fill="#ffffff" aria-hidden="true">
          <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
        </svg>
        <span className="text-2xl text-white">青媒设计</span>
      </div>
      {/* 中：胶囊导航 */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-2 backdrop-blur-md md:flex">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              it.active ? "text-white" : "text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            {it.label}
          </a>
        ))}
      </div>
      {/* 右：返回中心 */}
      <Link
        to="/"
        className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
      >
        返回中心
      </Link>
    </nav>
  );
}

/** Lithos 风光标聚光揭示 Hero */
function LithosHero() {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>();
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      // 静止时不触发 setState，避免空转重渲染（触屏/无鼠标环境省电）
      setCursorPos((prev) =>
        Math.abs(prev.x - smooth.current.x) < 0.1 && Math.abs(prev.y - smooth.current.y) < 0.1
          ? prev
          : { x: smooth.current.x, y: smooth.current.y }
      );
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black" style={{ height: "100dvh" }}>
      {/* 1. 底图 z-10 + 缓慢缩放 */}
      <div
        className="hero-zoom absolute inset-0 z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
      />
      {/* 压暗底图，保证白字可读（揭示层在其上，聚光处更亮） */}
      <div className="absolute inset-0 z-20 bg-black/45" />
      {/* 2. 聚光揭示层 z-30 */}
      <RevealLayer image={BG_IMAGE_2} cursorX={cursorPos.x} cursorY={cursorPos.y} />
      {/* 底部渐隐，平滑过渡到下方素材库 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-40 bg-gradient-to-b from-transparent to-black" />

      <HeroNav />

      {/* 3. 标题 z-50 */}
      <div className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center">
        <h1 className="leading-[0.95] text-white">
          <span
            className="hero-anim hero-reveal block text-5xl font-normal italic sm:text-7xl md:text-8xl"
            style={{ ...PLAYFAIR, letterSpacing: "-0.05em", animationDelay: "0.25s" }}
          >
            We give shape
          </span>
          <span
            className="hero-anim hero-reveal -mt-1 block text-5xl font-normal sm:text-7xl md:text-8xl"
            style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
          >
            to imagination
          </span>
        </h1>
      </div>

      {/* 4. 左下段落 z-50 */}
      <div
        className="hero-anim hero-fade absolute bottom-14 left-6 z-50 hidden max-w-[280px] sm:block md:left-14"
        style={{ animationDelay: "0.7s" }}
      >
        <p className="text-sm leading-relaxed text-white/85">
          门票、海报、推文配图……我们把灵感具现，让每一次相遇都被认真设计。
        </p>
      </div>

      {/* 5. 右下段落 + CTA z-50 */}
      <div
        className="hero-anim hero-fade absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[280px] sm:gap-5 md:right-14"
        style={{ animationDelay: "0.85s" }}
      >
        <p className="text-xs leading-relaxed text-white/85 sm:text-sm">
          移动光标，揭开设计的另一层。素材库收录设计部的门票与海报作品，持续更新——点击任意一张查看大图。
        </p>
        <a
          href="#gallery"
          className="rounded-full bg-[#FF7A59] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#f2694a] hover:shadow-lg hover:shadow-[#FF7A59]/30 active:scale-95"
        >
          进入素材库 →
        </a>
      </div>
    </section>
  );
}

export default function Design() {
  const total = designCategories.reduce((n, c) => n + c.images.length, 0);

  return (
    <div className="min-h-screen bg-background" style={INTER}>
      <LithosHero />

      {/* 关于 + 素材库（沿用主站米白，让彩色作品更跳） */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
          Material Library
        </Reveal>
        <Reveal as="h2" delay={80} className="font-display max-w-3xl text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          我们的<span className="text-soft">素材库</span>
        </Reveal>
        <Reveal as="p" delay={140} className="mt-5 max-w-2xl leading-relaxed text-soft">
          {STORY}
        </Reveal>
        <Reveal as="p" delay={190} className="mt-3 text-sm text-soft/70">
          按类别分组 · 共 {total} 张 · 点击查看大图
        </Reveal>
        <Reveal delay={230}>
          <div className="mt-6 flex flex-wrap gap-2">
            {designCategories.map((c) => (
              <a
                key={c.name}
                href={`#cat-${c.name}`}
                className="rounded-full border px-3.5 py-1.5 text-sm text-ink transition-colors"
                style={{ borderColor: ACCENT + "55", background: ACCENT + "10" }}
              >
                {c.name}
              </a>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="gallery" className="mx-auto max-w-7xl px-6 pb-24">
        <CategoryGallery categories={designCategories} accent={ACCENT} />
      </section>

      <Footer />
    </div>
  );
}
