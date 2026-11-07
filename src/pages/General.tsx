import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { CategoryGallery } from "../lib/CategoryGallery";
import { FeatureIcon, IconArrow } from "../lib/icons";
import { deptShowcases } from "../data/deptContent";
import { generalCategories } from "../data/generalCats";

const D = deptShowcases.general;
const ACCENT = D.accent; // #8B5CF6 紫
// HelveticaNowDisplay(onlinewebfonts, 国内不可达) → 自托管 Inter 替身
const HEADING = { fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontWeight: 500 } as const;
const HERO_VIDEO = "/assets/video/gen-hero.mp4";
const EMAIL = "3113074598@qq.com";
const GALLERY_COUNT = generalCategories.reduce((n, c) => n + c.images.length, 0);

/** 打字机：延迟后逐字显示，返回 {displayed, done}。 */
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);
  return { displayed, done };
}

/** 鼠标横向移动擦洗（scrub）视频进度，不自动播放。 */
function ScrubVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const prevX = useRef<number | null>(null);
  const targetTime = useRef(0);
  const seeking = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const SENSITIVITY = 0.8;
    const onMove = (e: MouseEvent) => {
      if (!v.duration) return;
      if (prevX.current === null) {
        prevX.current = e.clientX;
        return;
      }
      const delta = e.clientX - prevX.current;
      prevX.current = e.clientX;
      let t = targetTime.current + (delta / window.innerWidth) * SENSITIVITY * v.duration;
      t = Math.max(0, Math.min(v.duration, t));
      targetTime.current = t;
      if (!seeking.current) {
        seeking.current = true;
        v.currentTime = t;
      }
    };
    const onSeeked = () => {
      if (Math.abs(v.currentTime - targetTime.current) > 0.01) {
        v.currentTime = targetTime.current;
      } else {
        seeking.current = false;
      }
    };
    window.addEventListener("mousemove", onMove);
    v.addEventListener("seeked", onSeeked);
    return () => {
      window.removeEventListener("mousemove", onMove);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);
  return (
    <video
      ref={ref}
      src={HERO_VIDEO}
      muted
      playsInline
      preload="auto"
      className="absolute inset-0 z-0 h-full w-full object-cover"
      style={{ objectPosition: "70% center" }}
    />
  );
}

/** 复制小图标（两个交叠矩形） */
function CopyIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Mainframe 风顶部导航 */
function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "关于", href: "#about" },
    { label: "流程", href: "#process" },
    { label: "掠影", href: "#gallery" },
  ];
  return (
    <>
      <nav className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-4 text-black sm:px-8 sm:py-5">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-[21px] tracking-tight sm:text-[26px]" style={HEADING}>青媒综发®</span>
          <span className="select-none text-[25px] sm:text-[30px]" style={{ letterSpacing: "-0.02em" }}>✳︎</span>
        </Link>
        <div className="hidden items-center text-[23px] md:flex">
          {links.map((l, i) => (
            <span key={l.href}>
              <a href={l.href} className="transition-opacity hover:opacity-60">{l.label}</a>
              {i < links.length - 1 && <span>{"，"}</span>}
            </span>
          ))}
        </div>
        <Link to="/#recruit" className="hidden text-[23px] underline underline-offset-2 transition-opacity hover:opacity-60 md:inline">
          加入我们
        </Link>
        <button onClick={() => setOpen((o) => !o)} aria-label="菜单" className="flex flex-col gap-[5px] md:hidden">
          <span className={`h-[2px] w-6 bg-black transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`h-[2px] w-6 bg-black transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`h-[2px] w-6 bg-black transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
      </nav>

      <div
        className="fixed inset-0 z-[9] flex flex-col justify-center gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      >
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-[32px] font-medium text-black">
            {l.label}
          </a>
        ))}
        <Link to="/#recruit" onClick={() => setOpen(false)} className="text-[32px] font-medium text-black underline underline-offset-2">
          加入我们
        </Link>
      </div>
    </>
  );
}

/** 综发部 Mainframe Hero（鼠标擦洗视频 + 打字机 + 药丸按钮） */
function MainframeHero() {
  const { displayed, done } = useTypewriter("很高兴你来。在这里，做你真正热爱的事——主持、统筹、协调，我们，一起统筹些什么？");
  const [pillsVisible, setPillsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const filledPills = [
    { label: "我想加入综发", href: "/#recruit" },
    { label: "看看我们做什么", href: "#about" },
    { label: "瞧瞧部门掠影", href: "#gallery" },
    { label: "了解青媒", href: "/" },
  ];
  const pillBase =
    "inline-flex items-center justify-center rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap transition-colors duration-200";

  const copy = () => {
    navigator.clipboard?.writeText(EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <section className="relative flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
      <ScrubVideo />
      <Navbar />

      <div className="relative z-10 max-w-xl">
        {/* 引导语（原设计带 blur，用户要求清晰，改为柔和淡色不模糊） */}
        <div
          className="pointer-events-none mb-5 select-none sm:mb-6"
          style={{ fontSize: "clamp(18px, 4vw, 26px)", lineHeight: 1.3, fontWeight: 400, color: "rgba(0,0,0,0.6)" }}
        >
          你好，这里是综合发展部，
          <br />
          青媒运转背后的统筹、主持与保障
        </div>

        {/* 打字机 */}
        <p
          className="mb-5 text-black sm:mb-6"
          style={{ fontSize: "clamp(18px, 4vw, 26px)", lineHeight: 1.35, fontWeight: 400, minHeight: 54 }}
        >
          {displayed}
          {!done && <span className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-black align-middle" style={{ animation: "blink 1s step-end infinite" }} />}
        </p>

        {/* 药丸按钮 */}
        <div
          className="flex flex-wrap gap-y-1"
          style={{ opacity: pillsVisible ? 1 : 0, transform: pillsVisible ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.4s ease, transform 0.4s ease" }}
        >
          {filledPills.map((p) => (
            <a key={p.label} href={p.href} className={`${pillBase} border border-black/10 bg-white text-black hover:bg-black hover:text-white`}>
              {p.label}
            </a>
          ))}
          {/* 邮箱复制药丸（浅底改黑描边保证可读） */}
          <button onClick={copy} className={`${pillBase} gap-2 border border-black bg-transparent text-black hover:bg-black hover:text-white sm:gap-3`}>
            <span>
              邮箱：<span className="underline underline-offset-1">{EMAIL}</span>
            </span>
            <CopyIcon />
            {copied && <span className="text-[11px] opacity-70">已复制</span>}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function General() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', 'Helvetica Neue', 'Noto Sans SC', 'PingFang SC', Arial, sans-serif" }}>
      <MainframeHero />

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
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: ACCENT + "22", color: ACCENT }}>
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
      <section id="outputs" className="mx-auto max-w-5xl px-6 py-16">
        <Reveal as="h2" className="mb-10 text-center font-display text-2xl text-ink sm:text-3xl">
          我们产出
        </Reveal>
        <Reveal>
          <div className="flex flex-wrap justify-center gap-3">
            {D.outputs.map((o) => (
              <span key={o} className="rounded-full border px-5 py-2.5 text-sm font-medium text-ink" style={{ borderColor: ACCENT + "55", background: ACCENT + "12" }}>
                {o}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 部门掠影 */}
      {GALLERY_COUNT > 0 && (
        <section id="gallery" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal as="h2" className="mb-12 text-center font-display text-3xl text-ink sm:text-4xl">
            部门掠影
          </Reveal>
          <CategoryGallery categories={generalCategories} accent={ACCENT} />
        </section>
      )}

      {/* 金句 */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
        <Reveal as="blockquote" className="font-display text-3xl leading-snug text-ink sm:text-4xl">
          “{D.quote}”
        </Reveal>
        <Reveal delay={120}>
          <Link to="/#recruit" className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-white transition-transform hover:scale-[1.03]" style={{ background: ACCENT }}>
            加入{D.name}
            <IconArrow width={18} height={18} />
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
