import { useSiteContent } from "../lib/siteContent";
import { site } from "../data/site";
import { Reveal } from "../lib/Reveal";
import { Link } from "react-router-dom";

export function Recruit() {
  const { values } = useSiteContent();
  return (
    <section id="recruit" className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* 柔和光斑（统一珊瑚单色） */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-coral/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />

          <div className="relative">
            <span className="mb-5 inline-block rounded-full border border-line bg-background px-4 py-1.5 text-sm font-medium text-coral">
              {values.recruit_time}
            </span>
            <h2 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
              加入<em className="not-italic text-coral">青年媒体中心</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-soft">{values.recruit_intro}</p>
            {values.recruit_contact && <p className="mt-8 text-sm text-soft">{values.recruit_contact}</p>}
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-soft">具体招新时间与安排以官方通知为准。可以先了解各部门的工作，或通过下方官方联系方式咨询。</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/#departments" className="rounded-full bg-ink px-6 py-3 text-sm text-white">找到感兴趣的部门</Link><Link to="/#contact" className="rounded-full border border-line px-6 py-3 text-sm text-ink">官方联系方式与二维码</Link><a href={`mailto:${site.contact.email}`} className="rounded-full border border-line px-6 py-3 text-sm text-ink">邮件咨询</a></div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
