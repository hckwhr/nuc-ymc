import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export default function NotFound() {
  useEffect(() => { const previous = document.title; document.title = "页面未找到 · 青年媒体中心"; return () => { document.title = previous; }; }, []);
  return <><Navbar /><main className="mx-auto max-w-3xl px-6 pb-24 pt-40"><p className="font-mono text-coral">404</p><h1 className="mt-4 font-display text-4xl text-ink">这个页面暂时找不到</h1><p className="mt-6 leading-8 text-soft">链接可能已经失效，或地址输入有误。可以从下面的入口继续浏览。</p><div className="mt-8 flex flex-wrap gap-3">{[["/", "返回首页"], ["/#departments", "认识各部门"], ["/community", "浏览作品"]].map(([to, label]) => <Link key={to} to={to} className="rounded-full border border-line bg-surface px-6 py-3 text-sm text-ink">{label}</Link>)}</div></main><Footer /></>;
}
