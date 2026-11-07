import { useEffect, useRef, useState, type SVGProps } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../lib/Reveal";
import { Lightbox, type LightItem } from "../lib/Lightbox";
import { Footer } from "../components/Footer";
import { ossThumb } from "../lib/img";
import { IconArrow, FeatureIcon, DeptIcon } from "../lib/icons";
import { editorialCategories } from "../data/editorialCats";
import { deptShowcases } from "../data/deptContent";

const D = deptShowcases.editorial;
const ACCENT = D.accent; // #FBBF24 暖金
const SERIF = { fontFamily: "'Instrument Serif', 'Noto Serif SC', 'Songti SC', serif" } as const;
const HERO_VIDEO = "/assets/video/edit-hero.mp4";
const EDIT_IMAGES = editorialCategories.flatMap((c) => c.images);

/** 羽毛笔 logo 图标 */
function Feather(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 4C13 5 8.5 9.5 6 16l-2 4 4-2c6.5-2.5 11-7 12-14z" />
      <path d="M11 13c2-1 4-3 5-5M4 20l6-6" />
    </svg>
  );
}
/** 地球图标 */
function Globe(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.4 2.6 3.6 5.9 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.9-3.6-9S9.6 5.6 12 3z" />
    </svg>
  );
}

/** liquid glass 视频 Hero（自定义 rAF 淡入淡出无缝循环）——保持暗色大屏 */
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>();
  const fadingOutRef = useRef(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const FADE_MS = 500;
    const FADE_OUT_LEAD = 0.55; // 距结束 0.55s 开始淡出

    const cancelFade = () => rafRef.current && cancelAnimationFrame(rafRef.current);
    const fadeTo = (target: number, done?: () => void) => {
      cancelFade();
      const start = performance.now();
      const from = parseFloat(v.style.opacity || "1");
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / FADE_MS);
        v.style.opacity = String(from + (target - from) * t);
        if (t < 1) rafRef.current = requestAnimationFrame(step);
        else done?.();
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onLoaded = () => {
      v.style.opacity = "0";
      fadingOutRef.current = false;
      v.play().catch(() => {});
      fadeTo(1);
    };
    const onTimeUpdate = () => {
      if (!fadingOutRef.current && v.duration && v.duration - v.currentTime <= FADE_OUT_LEAD) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };
    const onEnded = () => {
      cancelFade();
      v.style.opacity = "0";
      setTimeout(() => {
        v.currentTime = 0;
        v.play().catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    if (v.readyState >= 2) onLoaded();
    return () => {
      cancelFade();
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = email ? `我的邮箱：${email}\n\n（想投稿 / 联系采编部）` : "（想投稿 / 联系采编部）";
    window.location.href = `mailto:3113074598@qq.com?subject=${encodeURIComponent("想联系采编部")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black">
      {/* 背景视频（object 定位偏下，露出精彩的下半部分） */}
      <video
        ref={videoRef}
        className="absolute inset-x-0 top-0 h-[135%] w-full object-cover"
        style={{ opacity: 0 }}
        src={HERO_VIDEO}
        autoPlay
        muted
        playsInline
        preload="auto"
      />
      {/* 上暗下透渐变：顶部压暗保证白字/导航可读，中下部放亮让人物与光晕透出 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/45" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* 导航（浮动毛玻璃胶囊） */}
        <div className="px-6 py-6">
          <nav className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-white">
                <Feather width={22} height={22} />
                <span className="text-lg font-semibold">青媒采编</span>
              </div>
              <div className="hidden items-center gap-8 md:flex">
                {[
                  { label: "作品", href: "#works" },
                  { label: "流程", href: "#process" },
                  { label: "关于", href: "#about" },
                ].map((l) => (
                  <a key={l.href} href={l.href} className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="#works" className="hidden text-sm font-medium text-white transition-opacity hover:opacity-80 sm:inline">
                投稿
              </a>
              <Link to="/" className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white">
                返回中心
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero 内容 */}
        <div className="flex flex-1 -translate-y-[14%] flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="mb-8 text-5xl tracking-tight text-white md:whitespace-nowrap md:text-6xl lg:text-7xl" style={SERIF}>
            Built for the <span className="italic">curious</span>
          </h1>

          <div className="w-full max-w-xl space-y-4">
            {/* 邮箱条 */}
            <form onSubmit={onSubmit} className="liquid-glass flex items-center gap-3 rounded-full py-2 pl-6 pr-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="留下你的邮箱，与采编联系"
                className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
              />
              <button type="submit" aria-label="联系采编" className="grid shrink-0 place-items-center rounded-full bg-white p-3 text-black transition-transform hover:scale-105">
                <IconArrow width={20} height={20} />
              </button>
            </form>

            {/* 副标题 */}
            <p className="px-4 text-sm leading-relaxed text-white">
              访牛人大咖，写多彩故事——采编部为「中北大学共青团」供稿，一篇篇过千上万阅读的推文，只写能触动自己的文字。
            </p>
          </div>

          {/* 宣言按钮 */}
          <a href="#works" className="liquid-glass mt-8 rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5">
            阅读我们的文字
          </a>
        </div>

        {/* 社交页脚 */}
        <div className="relative z-10 flex justify-center gap-4 pb-12">
          <a href="#about" aria-label="微信公众号 中北大学共青团" className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white">
            <DeptIcon k="wechat" width={20} height={20} />
          </a>
          <Link to="/douyin" aria-label="官方抖音 Nuc1941" className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white">
            <DeptIcon k="douyin" width={20} height={20} />
          </Link>
          <Link to="/" aria-label="返回青年媒体中心" className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white">
            <Globe width={20} height={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** 作品图库（浅色） */
function LightGallery() {
  const [light, setLight] = useState<{ items: LightItem[]; index: number } | null>(null);
  if (EDIT_IMAGES.length === 0) return null;
  const items: LightItem[] = EDIT_IMAGES.map((s) => ({ type: "image", src: s, caption: "采编作品" }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {EDIT_IMAGES.map((src, i) => (
          <Reveal key={src} delay={(i % 4) * 60}>
            <button
              onClick={() => setLight({ items, index: i })}
              className="group block w-full overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <img src={ossThumb(src, 600)} alt={`采编作品 ${i + 1}`} loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </button>
          </Reveal>
        ))}
      </div>
      {light && <Lightbox items={light.items} index={light.index} onClose={() => setLight(null)} />}
    </>
  );
}

export default function Editorial() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif" }}>
      <Hero />

      {/* 关于 */}
      <section id="about" className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
        <Reveal as="p" className="mb-5 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
          {D.nameEn}
        </Reveal>
        <Reveal as="h2" delay={80} className="text-4xl leading-snug text-ink sm:text-5xl" style={SERIF}>
          {D.tagline}
        </Reveal>
        <Reveal as="p" delay={140} className="mx-auto mt-6 max-w-2xl leading-relaxed text-soft">
          {D.intro}
        </Reveal>
      </section>

      {/* 我们写什么 */}
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
        <Reveal as="h2" className="mb-10 text-center text-2xl text-ink sm:text-3xl" style={SERIF}>
          我们如何工作
        </Reveal>
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          {D.process.map((step, i) => (
            <Reveal key={step} delay={i * 60} className="md:flex-1">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-col md:items-start md:gap-3">
                <span className="text-3xl" style={{ ...SERIF, color: ACCENT }}>
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
              <span key={o} className="rounded-full border px-5 py-2.5 text-sm font-medium text-ink" style={{ borderColor: ACCENT + "55", background: ACCENT + "12" }}>
                {o}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 作品 */}
      {EDIT_IMAGES.length > 0 && (
        <section id="works" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <Reveal as="h2" className="mb-10 text-center text-2xl text-ink sm:text-3xl" style={SERIF}>
            采编作品
          </Reveal>
          <LightGallery />
        </section>
      )}

      {/* 金句 */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
        <Reveal as="blockquote" className="text-3xl italic leading-snug text-ink sm:text-4xl" style={SERIF}>
          “{D.quote}”
        </Reveal>
        <Reveal delay={120}>
          <Link to="/#recruit" className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-black transition-transform hover:scale-[1.03]" style={{ background: ACCENT }}>
            加入{D.name}
            <IconArrow width={18} height={18} />
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
