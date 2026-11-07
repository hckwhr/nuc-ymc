import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";

export function Recruit() {
  return (
    <section id="recruit" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* 柔和光斑（统一珊瑚单色） */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-coral/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />

          <div className="relative">
            <span className="mb-5 inline-block rounded-full border border-line bg-background px-4 py-1.5 text-sm font-medium text-coral">
              {site.recruit.time}
            </span>
            <h2 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
              加入<em className="not-italic text-coral">青年媒体中心</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-soft">{site.recruit.intro}</p>
            {site.recruit.contact && <p className="mt-8 text-sm text-soft">{site.recruit.contact}</p>}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
