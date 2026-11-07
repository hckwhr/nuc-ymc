import { Link } from "react-router-dom";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { LongImageGallery } from "../lib/LongImageGallery";
import { FeatureIcon, IconArrow } from "../lib/icons";
import { wechatImages } from "../data/wechatImages";
import { deptShowcases } from "../data/deptContent";

const D = deptShowcases.wechat;
const ACCENT = D.accent; // #14B8A6 青碧
const SERIF = { fontFamily: "'Instrument Serif', 'Noto Serif SC', 'Songti SC', serif" } as const;

// 3D 书本几何参数（沿用 Foliom）
const PAGE_STEP = 1.1;
const PAGE_INSET = 8;
const SKEW = "30deg";

const PAGE_COUNTS = [16, 12, 18, 13, 15, 11, 17, 14, 19, 12];
const SPINES = [
  "linear-gradient(150deg,#0f766e 0%,#134e4a 100%)",
  "linear-gradient(150deg,#155e63 0%,#0e3a3d 100%)",
  "linear-gradient(150deg,#1f5a52 0%,#0d2e2c 100%)",
];

/** 取推文长图顶部一段作书封（OSS 裁切，体积小；本地退化为整图 cover+top）。 */
function bookCover(src: string) {
  return `${src}?x-oss-process=image/resize,w_420/crop,w_420,h_600,g_nw/quality,q_80`;
}

type BookData = { coverImage: string; spine: string; pageCount: number; src: string };
const BOOKS: BookData[] = wechatImages.map((src, i) => ({
  src,
  coverImage: bookCover(src),
  spine: SPINES[i % SPINES.length],
  pageCount: PAGE_COUNTS[i % PAGE_COUNTS.length],
}));

/** 单本 3D 书（书脊 + 页 + 封面图）。 */
function Book({ book, onClick }: { book: BookData; onClick: () => void }) {
  const depth = PAGE_STEP * (book.pageCount + 1);
  const pages = [];
  for (let i = 1; i <= book.pageCount; i++) {
    const t = i / book.pageCount;
    pages.push(
      <div
        key={i}
        className="wxm-layer wxm-page"
        style={{
          transform: `translateX(${PAGE_STEP * i}px) skewY(${SKEW})`,
          zIndex: 2 + (book.pageCount - i),
          filter: `brightness(${(1 - t * 0.06).toFixed(3)})`,
          top: `${PAGE_INSET / 2}px`,
          height: `calc(100% - ${PAGE_INSET}px)`,
        }}
      />
    );
  }
  return (
    <div className="wxm-book" style={{ width: `${200 + depth + 1.1}px` }} onClick={onClick} role="button" aria-label="查看推文">
      <div className="wxm-hinge" style={{ width: `${depth + 1}px`, background: book.spine }} />
      <div className="wxm-layer wxm-back" style={{ background: book.spine, transform: `translateX(${depth}px) skewY(${SKEW})` }} />
      {pages}
      <div className="wxm-layer wxm-front" style={{ transform: `skewY(${SKEW})`, backgroundColor: "#0e2e2c", backgroundImage: `url(${book.coverImage})` }} />
    </div>
  );
}

/** Foliom 风 3D 书架跑马灯 Hero（暗色大屏；书=公众号推文封面） */
function MarqueeHero() {
  const toWorks = () => document.getElementById("works")?.scrollIntoView({ behavior: "smooth" });
  const cats = ["校园资讯", "团学动态", "节日特辑", "人物专访", "通知公告"];
  // 重复堆叠铺满一整排：每半段 4×，再整体复制一份用于无缝循环
  const half = Array.from({ length: 4 }, () => BOOKS).flat();
  const loop = [...half, ...half];
  return (
    <section className="wxm-hero">
      {/* 导航 */}
      <nav className="absolute left-0 right-0 top-0 z-[200] flex items-center justify-between px-6 py-5 text-[#f5f1ea] md:px-12">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-7 place-items-center rounded border border-[#f5f1ea]/80 text-[10px]">微</span>
          <span className="text-2xl tracking-tight" style={SERIF}>青媒微信</span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-white/85 md:flex">
          <button onClick={toWorks} className="transition-colors hover:text-white">推文</button>
          <a href="#about" className="transition-colors hover:text-white">关于</a>
          <a href="#process" className="transition-colors hover:text-white">流程</a>
        </div>
        <Link to="/" className="rounded-full bg-[#f5f1ea] px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white">
          返回中心
        </Link>
      </nav>

      {/* 巨型标题 */}
      <h1 className="wxm-title">推文</h1>

      {/* 跑马灯 */}
      <div className="wxm-marquee-mask">
        <div className="wxm-marquee-fade">
          <div className="wxm-track">
            {loop.map((b, i) => (
              <div key={i} className="wxm-book-wrap" style={{ zIndex: loop.length - i }}>
                <Book book={b} onClick={toWorks} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 栏目胶囊 */}
      <div className="wxm-categories">
        {cats.map((c) => (
          <button key={c} onClick={toWorks} className="wxm-pill">
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function WeChat() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif" }}>
      <MarqueeHero />

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

      {/* 推文排版作品 */}
      {wechatImages.length > 0 && (
        <section id="works" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal as="h2" className="mb-4 text-center text-3xl text-ink sm:text-4xl" style={SERIF}>
            推文排版作品
          </Reveal>
          <Reveal as="p" className="mx-auto mb-12 max-w-md text-center text-sm text-soft">
            点击任意一张，即可上下滚动阅读完整推文。
          </Reveal>
          <LongImageGallery images={wechatImages} accent={ACCENT} />
        </section>
      )}

      {/* 金句 */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
        <Reveal as="blockquote" className="text-3xl italic leading-snug text-ink sm:text-4xl" style={SERIF}>
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
