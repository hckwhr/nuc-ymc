import { useEffect, useState } from "react";
import { site } from "../data/site";
import { logoSrc } from "../data/media";
import { IconMenu, IconClose } from "../lib/icons";

const LINKS = [
  { href: "/#about", label: "中心简介" },
  { href: "/#departments", label: "部门" },
  { href: "/#works", label: "作品" },
  { href: "/#stats", label: "数据" },
  { href: "/#recruit", label: "招新" },
  { href: "/#contact", label: "联系我们" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-line" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          {logoSrc ? (
            <img src={logoSrc} alt={site.center.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : null}
          <span className="font-display text-2xl leading-none tracking-tight text-ink">{site.center.name}</span>
        </a>

        {/* 桌面导航 */}
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-soft transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
          <a
            href="/#recruit"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            加入我们
          </a>
        </div>

        {/* 移动端按钮 */}
        <button
          className="grid h-11 w-11 place-items-center text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="菜单"
          aria-expanded={open}
        >
          {open ? <IconClose width={24} height={24} /> : <IconMenu width={24} height={24} />}
        </button>
      </nav>

      {/* 移动端下拉 */}
      {open && (
        <div className="border-t border-line bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3.5 text-sm text-soft"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/#recruit"
              onClick={() => setOpen(false)}
              className="mt-3 mb-2 rounded-full bg-ink py-3 text-center text-sm font-medium text-white"
            >
              加入我们
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
