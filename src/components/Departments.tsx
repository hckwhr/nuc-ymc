import { useSiteContent } from "../lib/siteContent";
import { Link } from "react-router-dom";
import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";
import { SectionHead } from "./SectionHead";
import { DeptIcon, IconArrow } from "../lib/icons";
import { useCategories, type Department } from "../lib/categories";

export function Departments() {
  const { values } = useSiteContent();
  const { departments } = useCategories();
  return (
    <section id="departments" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <SectionHead
        kicker="Departments"
        title={<>认识我们的<em className="not-italic text-coral">部门</em></>}
        sub="各展所长，一起把青春讲成故事。点击部门卡片，探索作品、日常与学习资料。"
      />

      <div className="flex flex-wrap justify-center gap-5">
        {site.departments.map((d, i) => {
          const catalog = departments[d.key as Department];
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
              <p className="text-sm leading-relaxed text-soft">{values[`department_${d.key}` as keyof typeof values] || d.desc}</p>
              {d.internal && <span className="mt-3 text-xs text-indigo-600">内部学习共享</span>}
              {catalog && <p className="mt-3 text-xs text-soft">{catalog.branches.length} 个作品分支 · {Object.values(catalog.counts || {}).reduce((sum, count) => sum + count, 0)} 件公开投稿</p>}
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
