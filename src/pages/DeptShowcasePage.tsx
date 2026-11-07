import { Link } from "react-router-dom";
import type { DeptShowcase } from "../data/deptContent";
import type { PhotoCategory } from "../data/photographyCats";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { CategoryGallery } from "../lib/CategoryGallery";
import { LongImageGallery } from "../lib/LongImageGallery";
import { IconArrow, FeatureIcon } from "../lib/icons";

export function DeptShowcasePage({
  d,
  gallery,
  longImages,
}: {
  d: DeptShowcase;
  gallery?: { title: string; categories: PhotoCategory[] };
  longImages?: { title: string; images: string[] };
}) {
  const accentStyle = { ["--accent" as string]: d.accent } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={accentStyle}>
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-soft transition-colors hover:text-ink">
            <IconArrow width={16} height={16} className="rotate-180" />
            青年媒体中心
          </Link>
          <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: d.accent + "18", color: d.accent }}>
            {d.name}
          </span>
        </div>
      </header>

      {/* 头部 */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: d.accent + "22" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center sm:py-28">
          <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: d.accent }}>
            {d.nameEn}
          </Reveal>
          <Reveal as="h1" delay={80} className="font-display text-5xl leading-tight tracking-tight text-ink sm:text-7xl">
            {d.name}
          </Reveal>
          <Reveal as="p" delay={140} className="mx-auto mt-5 font-display text-xl italic text-soft sm:text-2xl">
            {d.tagline}
          </Reveal>
          <Reveal as="p" delay={200} className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-soft">
            {d.intro}
          </Reveal>
          <Reveal delay={260}>
            <span className="mx-auto mt-8 block h-1 w-16 rounded-full" style={{ background: d.accent }} />
          </Reveal>
        </div>
      </section>

      {/* 我们做什么 */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <Reveal as="h2" className="mb-12 text-center font-display text-3xl text-ink sm:text-4xl">
          我们做什么
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {d.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="flex gap-5 rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: d.accent + "18", color: d.accent }}>
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
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <Reveal as="h2" className="mb-12 text-center font-display text-3xl text-ink sm:text-4xl">
          我们如何工作
        </Reveal>
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-3">
          {d.process.map((step, i) => (
            <Reveal key={step} delay={i * 70} className="md:flex-1">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 md:flex-col md:items-start md:gap-3">
                <span className="font-display text-3xl" style={{ color: d.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-medium text-ink">{step}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 我们产出 */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <Reveal as="h2" className="mb-10 text-center font-display text-3xl text-ink sm:text-4xl">
          我们产出
        </Reveal>
        <Reveal>
          <div className="flex flex-wrap justify-center gap-3">
            {d.outputs.map((o) => (
              <span
                key={o}
                className="rounded-full border px-5 py-2.5 text-sm font-medium text-ink"
                style={{ borderColor: d.accent + "55", background: d.accent + "10" }}
              >
                {o}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 分类图库（有素材时） */}
      {gallery && gallery.categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal as="h2" className="mb-12 text-center font-display text-3xl text-ink sm:text-4xl">
            {gallery.title}
          </Reveal>
          <CategoryGallery categories={gallery.categories} accent={d.accent} />
        </section>
      )}

      {/* 长图区块（微信部推文） */}
      {longImages && longImages.images.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal as="h2" className="mb-4 text-center font-display text-3xl text-ink sm:text-4xl">
            {longImages.title}
          </Reveal>
          <Reveal as="p" className="mx-auto mb-12 max-w-md text-center text-sm text-soft">
            点击任意一张，即可上下滚动阅读完整推文。
          </Reveal>
          <LongImageGallery images={longImages.images} accent={d.accent} />
        </section>
      )}

      {/* 理念金句 + 加入 */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
        <Reveal as="blockquote" className="font-display text-3xl leading-snug text-ink sm:text-4xl">
          “{d.quote}”
        </Reveal>
        <Reveal delay={120}>
          <Link
            to="/#recruit"
            className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-white transition-transform hover:scale-[1.03]"
            style={{ background: d.accent }}
          >
            加入{d.name}
            <IconArrow width={18} height={18} />
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
