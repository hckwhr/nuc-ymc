import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-soft">
            About Us
          </Reveal>
          <Reveal as="h2" delay={80} className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            我们是校园里的<br />
            <em className="not-italic text-coral">
              记录者与发声者
            </em>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <p className="text-lg leading-loose text-soft">{site.center.about}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {site.departments.map((d) => (
              <span
                key={d.key}
                className="rounded-full border px-3.5 py-1.5 text-sm text-ink"
                style={{ borderColor: d.accent + "55", background: d.accent + "12" }}
              >
                {d.name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
