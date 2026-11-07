import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";
import { useCountUp } from "../lib/useCountUp";

function StatItem({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const { ref, val } = useCountUp(value);
  return (
    <div className="text-center">
      <div className="font-display text-5xl leading-none text-white sm:text-6xl">
        <span ref={ref}>{val}</span>
        <span className="text-coral">{suffix}</span>
      </div>
      <p className="mt-3 text-sm text-white/55">{label}</p>
    </div>
  );
}

export function Stats() {
  return (
    <section id="stats" className="relative overflow-hidden bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {site.stats.map((s) => (
              <StatItem key={s.label} label={s.label} value={s.value} suffix={s.suffix} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
