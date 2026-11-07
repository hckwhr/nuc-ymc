import type { ReactNode } from "react";
import { Reveal } from "../lib/Reveal";

export function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-soft">
        {kicker}
      </Reveal>
      <Reveal as="h2" delay={80} className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
        {title}
      </Reveal>
      {sub && (
        <Reveal as="p" delay={160} className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-soft">
          {sub}
        </Reveal>
      )}
    </div>
  );
}
