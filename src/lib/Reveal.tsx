import { useEffect, useRef, type ReactNode, type ElementType } from "react";

/** 滚动进场：进入视口时加 .in 触发淡入上移。 */
export function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  delay?: number;
  children: ReactNode;
  [k: string]: unknown;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
