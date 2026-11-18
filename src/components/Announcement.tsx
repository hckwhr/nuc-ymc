import { useSiteContent } from "../lib/siteContent";

export function Announcement() {
  const { values } = useSiteContent();
  if (!values.announcement_title || !values.announcement_body) return null;
  return <section aria-label="中心公告" className="mx-auto max-w-7xl px-6 pt-12"><div className="rounded-2xl border border-coral/30 bg-surface p-6 sm:p-8"><p className="text-xs tracking-widest text-coral">中心公告</p><h2 className="mt-3 break-words text-2xl text-ink">{values.announcement_title}</h2><p className="mt-4 whitespace-pre-wrap break-words leading-8 text-soft">{values.announcement_body}</p></div></section>;
}
