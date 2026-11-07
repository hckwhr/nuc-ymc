import { Link } from "react-router-dom";
import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";
import { SectionHead } from "./SectionHead";
import { DeptIcon, IconArrow } from "../lib/icons";

export function Departments() {
  return (
    <section id="departments" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <SectionHead
        kicker="Departments"
        title={<>七大<em className="not-italic text-coral">部门</em></>}
        sub="各展所长，一起把青春讲成故事。摄影 / 设计 / 抖音 部门可点击进入专属展示站。"
      />

      <div className="flex flex-wrap justify-center gap-5">
        {site.departments.map((d, i) => {
          const inner = (
            <>
              <div
                className="mb-5 grid h-12 w-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: d.accent + "18", color: d.accent }}
              >
                <DeptIcon k={d.key} width={24} height={24} />
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="font-display text-2xl text-ink">{d.name}</h3>
                <span className="text-xs uppercase tracking-widest text-soft/70">{d.nameEn}</span>
              </div>
              <p className="text-sm leading-relaxed text-soft">{d.desc}</p>
              <div className="mt-5">
                {d.link ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: d.accent }}
                  >
                    进入{d.name}
                    <IconArrow width={16} height={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                ) : (
                  <span className="text-xs text-soft/60">部门介绍</span>
                )}
              </div>
            </>
          );

          const cardCls =
            "group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-[color:var(--accent)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.18)]";
          const cardStyle = { ["--accent" as string]: d.accent } as React.CSSProperties;

          return (
            <Reveal
              key={d.key}
              delay={i * 60}
              className="basis-full sm:basis-[calc(50%-0.625rem)] lg:basis-[calc(33.333%-0.834rem)]"
            >
              {d.link ? (
                <Link to={d.link} className={cardCls} style={cardStyle}>
                  {inner}
                </Link>
              ) : (
                <div className={cardCls} style={cardStyle}>
                  {inner}
                </div>
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
