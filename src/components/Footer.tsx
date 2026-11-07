import { Link } from "react-router-dom";
import { site } from "../data/site";
import { logoSrc } from "../data/media";
import { ossThumb } from "../lib/img";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="border-t border-line bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* 品牌 */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              {logoSrc && <img src={logoSrc} alt={site.center.name} className="h-9 w-9 rounded-lg object-cover" />}
              <span className="font-display text-2xl text-ink">{site.center.name}</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-soft">{site.center.slogan}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {site.departments.map((d) => (
                <span key={d.key} className="text-xs text-soft/70">
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          {/* 联系 */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-ink">联系我们</h4>
            <ul className="space-y-2.5 text-sm text-soft">
              <li>微信公众号：{site.contact.wechat}</li>
              <li>抖音号：{site.contact.douyin}</li>
              <li>邮箱：{site.contact.email}</li>
            </ul>
            <div className="mt-5 flex gap-4">
              <Link to="/photography" className="text-sm text-soft transition-colors hover:text-sky">摄影部</Link>
              <Link to="/design" className="text-sm text-soft transition-colors hover:text-coral">设计部</Link>
              <Link to="/douyin" className="text-sm text-soft transition-colors hover:text-rose">抖音部</Link>
            </div>
          </div>

          {/* 二维码 */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-ink">扫码关注</h4>
            <div className="flex flex-wrap gap-5">
              {site.contact.qrcodes.length > 0 ? (
                site.contact.qrcodes.map((q) => (
                  <div key={q.src} className="text-center">
                    <img
                      src={ossThumb(q.src, 420)}
                      alt={q.label}
                      loading="lazy"
                      className="h-auto w-28 rounded-xl border border-line bg-white/5 sm:w-32"
                    />
                    <span className="mt-2 block text-xs text-soft">{q.label}</span>
                  </div>
                ))
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-xl border border-dashed border-line text-center text-xs text-soft/60">
                  二维码<br />待补充
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-14 border-t border-line pt-6 text-center text-xs text-soft/70">
          © {year} {site.center.name} · {site.center.nameEn} · Made with 热爱
        </p>
      </div>
    </footer>
  );
}
