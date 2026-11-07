import { site } from "../data/site";
import { useFadeLoopVideo } from "../lib/useFadeLoopVideo";
import { IconArrow } from "../lib/icons";

const HERO_VIDEO = "/assets/video/hero.mp4"; // ★占位★ 换成你们自己的校园/活动视频即可

export function Hero() {
  const videoRef = useFadeLoopVideo();

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden">
      {/* 视频背景层 */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={HERO_VIDEO}
          muted
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        {/* 渐变遮罩：顶部/底部淡入米白底，保证文字可读 + 与下一屏衔接 */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/25 to-background" />
        <div className="absolute inset-0 bg-background/10" />
      </div>

      {/* 内容层 */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <p className="reveal in mb-6 text-xs font-medium uppercase tracking-[0.35em] text-soft animate-fade-rise">
          {site.center.nameEn}
        </p>

        <h1 className="font-display text-5xl font-normal leading-[1.05] tracking-tight text-ink sm:text-7xl md:text-[5.5rem] animate-fade-rise">
          {site.center.heroLead}
          <br />
          <em className="not-italic text-coral">
            {site.center.heroEmph}
          </em>
        </h1>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-soft sm:text-lg animate-fade-rise-delay">
          {site.center.intro}
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-4 animate-fade-rise-delay-2">
          <a
            href="#departments"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-base font-medium text-white transition-transform hover:scale-[1.03]"
          >
            认识七大部门
            <IconArrow width={18} height={18} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#works"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/50 px-8 py-4 text-base font-medium text-ink backdrop-blur transition-colors hover:bg-white"
          >
            看作品
          </a>
        </div>
      </div>

      {/* 向下滚动提示：极简发丝线 */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-float">
        <span className="block h-12 w-px bg-gradient-to-b from-transparent via-soft/40 to-soft/70" />
      </div>
    </section>
  );
}
