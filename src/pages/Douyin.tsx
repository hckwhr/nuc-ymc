import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../lib/Reveal";
import { Footer } from "../components/Footer";
import { IconPlay } from "../lib/icons";
import { douyinVideos, douyinDaily } from "../data/media";
import { CategoryGallery } from "../lib/CategoryGallery";

// 字体：参考用 Fontshare「General Sans」。其 CDN(BunnyCDN)在国内不可达，
// 故以自托管的 Inter 作等价替身(几何 grotesque，Hero 大字观感一致)。
const FONT = {
  fontFamily: "'General Sans', 'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
} as const;
const HERO_VIDEO = "/assets/video/douyin-hero.mp4";
const ACCENT = "#FB6F92"; // 抖音部点缀色（玫红）

/** 小箭头（下拉指示，纯装饰） */
function Chevron() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * 分层胶囊按钮：0.6px 白色外描边 + 内层实心胶囊 + 顶部柔光streak。
 * variant="dark" 内层黑底白字；variant="light" 内层白底黑字。
 */
function PillButton({
  children,
  variant = "dark",
  href,
  to,
}: {
  children: ReactNode;
  variant?: "dark" | "light";
  href?: string;
  to?: string;
}) {
  const inner = variant === "dark" ? "bg-black text-white" : "bg-white text-black";
  const body = (
    <span className="relative inline-flex overflow-hidden rounded-full" style={{ border: "0.6px solid rgba(255,255,255,0.85)" }}>
      <span className={`relative z-10 block rounded-full px-[29px] py-[11px] text-sm font-medium ${inner}`}>{children}</span>
      {/* 顶部柔光：一半被 overflow-hidden 裁掉，剩下一道亮边 */}
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-50 blur-md" />
    </span>
  );
  const cls = "inline-flex transition-transform hover:scale-[1.03] active:scale-95";
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  return <a href={href} className={cls}>{body}</a>;
}

/** 顶部导航（Web3 风，横向铺开） */
function Web3Nav() {
  const links = [
    { label: "作品", href: "#works" },
    { label: "关注", href: "#follow" },
    { label: "关于", href: "#about" },
  ];
  return (
    <nav className="flex items-center justify-between px-6 py-5 md:px-[120px] md:py-[20px]">
      {/* 左：品牌 + 链接 */}
      <div className="flex items-center gap-[30px]">
        <span className="text-lg font-semibold tracking-tight text-white">青媒抖音</span>
        <div className="hidden items-center gap-[30px] md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white">
              {l.label}
              <Chevron />
            </a>
          ))}
          <Link to="/" className="text-sm font-medium text-white/90 transition-colors hover:text-white">
            返回中心
          </Link>
        </div>
      </div>
      {/* 右：关注抖音（深色胶囊） */}
      <PillButton href="#follow" variant="dark">关注抖音</PillButton>
    </nav>
  );
}

/** Web3 风全屏视频 Hero（保持暗色大屏） */
function Hero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black" style={FONT}>
      <video
        className="absolute inset-0 h-full w-full object-cover object-top"
        src={HERO_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Web3Nav />

        <div className="flex flex-1 flex-col items-center px-6 pb-[102px] pt-[200px] text-center md:pt-[280px]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-[20px] border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-medium">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="text-white/60">中北大学官方抖音</span>
            <span className="text-white"> Nuc1941</span>
          </div>

          {/* 渐变标题 */}
          <h1
            className="mx-auto mt-10 max-w-[613px] text-[36px] font-medium leading-[1.28] md:text-[56px]"
            style={{
              backgroundImage: "linear-gradient(144.5deg, #FFFFFF 28%, rgba(0,0,0,0) 115%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            青春，值得被看见的每一帧
          </h1>

          {/* 副标题 */}
          <p className="mx-auto mt-6 max-w-[680px] text-[15px] font-normal leading-relaxed text-white/70">
            我们运营中北大学官方抖音号，集摄像（无人机航拍、摄影机实拍）、剪辑（PR / PS / 达芬奇）、配乐于一体，把校园里最鲜活的瞬间讲给你听——记录属于中北的青春现场。
          </p>

          {/* CTA（浅色胶囊） */}
          <div className="mt-10">
            <PillButton href="#follow" variant="light">关注抖音</PillButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 进入视口自动静音循环播放，离开暂停；点击播放器可开声音。 */
function VideoCard({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.4 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black shadow-sm">
      <video ref={ref} src={src} muted loop playsInline controls preload="metadata" className="aspect-[9/16] w-full bg-black object-cover" />
    </div>
  );
}

export default function Douyin() {
  return (
    <div className="min-h-screen bg-background" style={FONT}>
      <Hero />

      {/* 精选作品（浅色，和主站一致） */}
      <section id="works" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
          Works
        </Reveal>
        <Reveal as="h2" delay={80} className="font-display max-w-3xl text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          精选<span className="text-soft">短视频</span>
        </Reveal>
        <Reveal as="p" delay={140} className="mt-5 max-w-2xl leading-relaxed text-soft">
          划到即自动播放，点击播放器可开声音。{douyinVideos.length > 0 && `共 ${douyinVideos.length} 个作品，持续更新。`}
        </Reveal>

        <div className="mt-10">
          {douyinVideos.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {douyinVideos.map((src, i) => (
                <Reveal key={src} delay={(i % 4) * 60}>
                  <VideoCard src={src} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="grid place-items-center rounded-[2rem] border border-dashed border-line px-6 py-24 text-center">
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ background: ACCENT + "18", color: ACCENT }}>
                  <IconPlay width={28} height={28} />
                </div>
                <h3 className="font-display text-2xl text-ink">视频素材整理中</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-soft">
                  把抖音精选短视频（mp4）放进 <code className="rounded bg-background px-1.5 py-0.5">素材待放/抖音部/视频/</code>，我就会填充到这里。
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* 工作日常（幕后） */}
      {douyinDaily.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-8">
          <Reveal as="p" className="mb-4 text-xs font-medium uppercase tracking-[0.35em]" style={{ color: ACCENT }}>
            Behind the Scenes
          </Reveal>
          <Reveal as="h2" delay={80} className="font-display max-w-3xl text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            工作<span className="text-soft">日常</span>
          </Reveal>
          <Reveal as="p" delay={140} className="mt-5 max-w-2xl leading-relaxed text-soft">
            镜头背后，是一群把青春讲给你听的人。
          </Reveal>
          <div className="mt-10">
            <CategoryGallery categories={[{ name: "", images: douyinDaily }]} accent={ACCENT} />
          </div>
        </section>
      )}

      {/* 关于 + 关注 */}
      <section id="follow" className="mx-auto max-w-3xl px-6 pb-24">
        <Reveal>
          <div id="about" className="flex flex-col items-center gap-7 rounded-[2rem] border border-line bg-surface p-8 text-center sm:flex-row sm:text-left">
            <img
              src="/assets/qr/qr-douyin.jpg"
              alt="抖音二维码 Nuc1941"
              className="h-40 w-40 shrink-0 rounded-2xl border border-line object-cover"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Follow Us</p>
              <h3 className="mt-2 font-display text-3xl text-ink">关注我们的抖音</h3>
              <p className="mt-3 text-soft">
                抖音号：<span className="font-semibold text-ink">Nuc1941</span>
              </p>
              <p className="mt-1 text-sm text-soft/70">打开抖音「扫一扫」，看更多青春现场。</p>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
