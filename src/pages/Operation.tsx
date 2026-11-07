import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { CategoryGallery } from "../lib/CategoryGallery";
import { FeatureIcon, IconArrow } from "../lib/icons";
import { deptShowcases } from "../data/deptContent";
import { operationCategories } from "../data/operationCats";
// Didot 风高对比衬线：用自托管的 Playfair Display（同属 Didone 类）顶上，不走外链字体，国内直连快
import "@fontsource/playfair-display/latin-400.css";

const D = deptShowcases.operation;
const ACCENT = D.accent; // #10B981 薄荷绿

const HERO_VIDEO = "/assets/video/op-hero.mp4";

/** 'Didot' 留在首位，将来拿到真字体文件可直接落位；中文回落宋体系。 */
const DIDOT = {
  fontFamily:
    "'Didot', 'Playfair Display', 'Didot LT STD', 'Hoefler Text', 'Noto Serif SC', 'Songti SC', Garamond, 'Times New Roman', serif",
} as const;
const SANS = { fontFamily: "'Inter', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif" } as const;

/** SVG 胶片颗粒：内联 data URI，零外部请求。 */
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

const CARD_W = 600;
const CARD_H = 800;

/**
 * 卡片按视口等比缩放，保住 600×800 的像素级构图。
 * transform 不改变布局盒，故用负 margin 把布局尺寸同步收到视觉尺寸，避免小屏横向溢出。
 */
function useCardScale() {
  const calc = () =>
    Math.max(0.34, Math.min(1, (window.innerWidth - 32) / CARD_W, (window.innerHeight - 128) / CARD_H));
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

/** 电影感玻璃卡片大屏（黑场 + 600×800 竖版卡片；视频下半本身是暗的，不加压暗遮罩）。 */
function CinematicHero() {
  const scale = useCardScale();
  const toAbout = () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  const tags = ["策划", "统筹", "复盘"];

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#000000]">
      {/* 导航：落在卡片之外的黑场里，不动卡片构图 */}
      <nav className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-3 text-[#f0f0f0]">
          <span className="grid h-8 w-7 place-items-center rounded border border-[#f0f0f0]/70 text-[10px]">运</span>
          <span className="text-2xl tracking-tight" style={DIDOT}>
            青媒运营
          </span>
        </div>
        <Link
          to="/"
          className="rounded-full bg-[#f0f0f0] px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
        >
          返回中心
        </Link>
      </nav>

      <div
        className="relative overflow-hidden bg-black shadow-2xl"
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          margin: `${(scale - 1) * (CARD_H / 2)}px ${(scale - 1) * (CARD_W / 2)}px`,
        }}
      >
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-100"
          src={HERO_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />

        {/* 胶片颗粒（盖在文字之上，营造整体胶片质感） */}
        <div
          className="pointer-events-none absolute inset-0 z-50 opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />

        <div className="relative z-20 flex h-full w-full flex-col px-12 py-10">
          <p className="text-[22px] tracking-normal text-[#f0f0f0] drop-shadow-md" style={DIDOT}>
            有你，才叫「新」媒体。
          </p>

          <div className="flex-1" />

          <div className="mb-12 flex flex-col">
            <h1
              className="mb-2 ml-[-0.3px] whitespace-nowrap text-[38px] leading-tight tracking-normal text-white drop-shadow-md"
              style={DIDOT}
            >
              让每一场活动，都被看见。
            </h1>
            <p className="mb-8 text-[15.5px] font-extralight tracking-wide text-[#a3a3a3]">
              从一句想法，到一场热闹——策划、统筹、执行、复盘。
            </p>
            <div>
              <button
                onClick={toAbout}
                className="group relative overflow-hidden rounded-full px-6 py-[10px] text-[14px] font-light text-[#e0e0e0] backdrop-blur-md transition-all duration-300"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  boxShadow:
                    "0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 140, 70, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.8)",
                }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[20px] rounded-t-full bg-gradient-to-b from-[#ff8c46]/10 to-transparent" />
                <span
                  className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at center, rgba(255, 120, 50, 0.1) 0%, transparent 70%)" }}
                />
                <span className="relative z-10 text-[14px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  走进运营部
                </span>
              </button>
            </div>
          </div>

          <div className="flex w-full translate-y-[10px] items-end justify-between text-[15px] font-light tracking-wide text-[#7a7a7a]">
            <span className="cursor-pointer transition-colors hover:text-white">青年媒体中心 · 运营部</span>
            <div className="flex items-center gap-3">
              {tags.map((t, i) => (
                <Fragment key={t}>
                  {i > 0 && <span className="mt-[-2px] text-[11px] text-[#555] opacity-80">✦</span>}
                  <span className="cursor-default transition-colors hover:text-white">{t}</span>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Operation() {
  return (
    <div className="min-h-screen bg-background" style={SANS}>
      <CinematicHero />

      {/* 关于 */}
      <section id="about" className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
        <Reveal as="p" className="mb-5 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
          {D.nameEn}
        </Reveal>
        <Reveal as="h2" delay={80} className="font-display text-4xl leading-snug text-ink sm:text-5xl">
          {D.tagline}
        </Reveal>
        <Reveal as="p" delay={140} className="mx-auto mt-6 max-w-2xl leading-relaxed text-soft">
          {D.intro}
        </Reveal>
      </section>

      {/* 我们做什么 */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {D.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="flex h-full gap-5 rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                  style={{ background: ACCENT + "22", color: ACCENT }}
                >
                  <FeatureIcon k={f.icon} width={24} height={24} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-soft">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 工作流程 */}
      <section id="process" className="mx-auto max-w-5xl px-6 py-16">
        <Reveal as="h2" className="mb-10 text-center font-display text-2xl text-ink sm:text-3xl">
          我们如何工作
        </Reveal>
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          {D.process.map((step, i) => (
            <Reveal key={step} delay={i * 60} className="md:flex-1">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-col md:items-start md:gap-3">
                <span className="font-display text-3xl" style={{ color: ACCENT }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-medium text-ink">{step}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 我们产出 */}
      <section className="mx-auto max-w-5xl px-6 pb-4">
        <Reveal>
          <div className="flex flex-wrap justify-center gap-3">
            {D.outputs.map((o) => (
              <span
                key={o}
                className="rounded-full border px-5 py-2.5 text-sm font-medium text-ink"
                style={{ borderColor: ACCENT + "55", background: ACCENT + "12" }}
              >
                {o}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 运营现场 */}
      <section id="works" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <Reveal as="h2" className="mb-12 text-center font-display text-3xl text-ink sm:text-4xl">
          运营现场
        </Reveal>
        <CategoryGallery categories={operationCategories} accent={ACCENT} />
      </section>

      {/* 金句 */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
        <Reveal as="blockquote" className="font-display text-3xl italic leading-snug text-ink sm:text-4xl">
          “{D.quote}”
        </Reveal>
        <Reveal delay={120}>
          <Link
            to="/#recruit"
            className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-white transition-transform hover:scale-[1.03]"
            style={{ background: ACCENT }}
          >
            加入{D.name}
            <IconArrow width={18} height={18} />
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
