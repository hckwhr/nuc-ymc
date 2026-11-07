import { Link } from "react-router-dom";
import { photographyCategories } from "../data/photographyCats";
import { CategoryGallery } from "../lib/CategoryGallery";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
// 摄影部 Hero 专用字体（securify 参考用 Readex Pro，自托管拉丁子集，不走 Google）
import "@fontsource/readex-pro/latin-300.css";
import "@fontsource/readex-pro/latin-400.css";
import "@fontsource/readex-pro/latin-500.css";
import "@fontsource/readex-pro/latin-600.css";
import "@fontsource/readex-pro/latin-700.css";

const READEX = { fontFamily: "'Readex Pro', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" } as const;
const ACCENT = "#38BDF8"; // 摄影部点缀色（天蓝）
const HERO_VIDEO = "/assets/video/photo-hero.mp4";
const TOTAL = photographyCategories.reduce((n, c) => n + c.images.length, 0);

/** 顶部悬浮胶囊导航 */
function PillNav() {
  return (
    <nav className="absolute left-0 right-0 top-0 z-20 px-6 pt-6 md:px-10">
      <div className="flex items-center justify-between gap-4">
        {/* 左：logo + 品牌 */}
        <div className="flex items-center gap-2 rounded-full bg-neutral-900/90 py-3 pl-4 pr-6 backdrop-blur">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2l1-1.6A1 1 0 0 1 9.5 4h5a1 1 0 0 1 .85.5L16.3 6h2.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </svg>
          <span className="text-sm font-normal tracking-tight text-white">青媒摄影</span>
        </div>
        {/* 中：链接胶囊 */}
        <div className="hidden items-center gap-1 rounded-full bg-neutral-900/90 px-3 py-2 backdrop-blur md:flex">
          {[
            { label: "全部作品", href: "#gallery" },
            { label: "主题分类", href: "#cats" },
            { label: "关于", href: "#about" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-5 py-2 text-sm text-neutral-300 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </div>
        {/* 右：返回中心 */}
        <Link to="/" className="rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200">
          返回中心
        </Link>
      </div>
    </nav>
  );
}

/** securify 风格全屏 Hero（保持暗色大屏） */
function Hero() {
  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-black" style={READEX}>
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="auto" src={HERO_VIDEO} />
      <div className="absolute inset-0 bg-black/35" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-black" />

      <PillNav />

      <div className="relative h-full w-full">
        {/* 三个错落大字 */}
        <h1 className="hero-title absolute left-4 top-[18%] font-medium text-white text-[14vw] md:left-10 md:text-[13vw]">capture</h1>
        <h1 className="hero-title absolute right-4 top-[38%] font-medium text-white text-[14vw] md:right-10 md:text-[13vw]">the</h1>
        <h1 className="hero-title absolute left-[16%] top-[58%] font-medium text-white text-[14vw] md:left-[28%] md:text-[13vw]">light</h1>

        {/* 描述 */}
        <p className="absolute left-6 top-[46%] max-w-[240px] text-[15px] leading-snug text-white/90 md:left-10">
          用镜头记录中北的四季与青春，捕捉每一个值得被看见的瞬间。
        </p>

        {/* 右上统计 */}
        <div className="absolute right-6 top-[14%] md:right-24">
          <div className="flex items-center justify-end gap-3">
            <span className="hidden h-px w-24 rotate-[20deg] bg-white/40 md:block" />
            <span className="text-4xl font-medium tracking-tight text-white md:text-5xl">{TOTAL}+</span>
          </div>
          <p className="mt-1 text-right text-xs text-white/70 md:text-sm">精选作品</p>
        </div>

        {/* 左下统计 */}
        <div className="absolute bottom-20 left-6 md:bottom-24 md:left-20">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-medium tracking-tight text-white md:text-5xl">{photographyCategories.length}</span>
            <span className="hidden h-px w-24 rotate-[-20deg] bg-white/40 md:block" />
          </div>
          <p className="mt-1 text-xs text-white/70 md:text-sm">主题分类</p>
        </div>

        {/* 右下统计 */}
        <div className="absolute bottom-16 right-6 md:bottom-20 md:right-20">
          <div className="flex items-center justify-end gap-3">
            <span className="hidden h-px w-24 rotate-[-20deg] bg-white/40 md:block" />
            <span className="text-4xl font-medium tracking-tight text-white md:text-5xl">365</span>
          </div>
          <p className="mt-1 text-right text-xs text-white/70 md:text-sm">天在记录</p>
        </div>
      </div>
    </section>
  );
}

export default function Photography() {
  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {/* 关于 + 素材库（浅色，和主站一致） */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
          Gallery
        </Reveal>
        <Reveal as="h2" delay={80} className="font-display max-w-3xl text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          我们的<span className="text-soft">素材库</span>
        </Reveal>
        <Reveal as="p" delay={140} className="mt-5 max-w-2xl leading-relaxed text-soft">
          脚下乾坤大，镜头囊天地。这里收录摄影部的全部作品，按主题分类，持续更新——城市、自然、飞行、星空、人物背影……记录属于每一个中北人的一年四季。点击任意一张查看大图。
        </Reveal>
        <Reveal as="p" delay={190} className="mt-3 text-sm text-soft/70">
          按主题分组 · 共 {TOTAL} 张 · 点击查看大图
        </Reveal>

        {/* 分类快捷跳转 */}
        <Reveal delay={230}>
          <div id="cats" className="mt-6 flex flex-wrap gap-2">
            {photographyCategories.map((c) => (
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
        <CategoryGallery categories={photographyCategories} accent={ACCENT} />
      </section>

      <Footer />
    </div>
  );
}
