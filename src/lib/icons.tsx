import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconMenu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z" /></svg>
);
export const IconChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>
);
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);

const DEPT: Record<string, JSX.Element> = {
  photography: <><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2l1-1.6A1 1 0 0 1 9.5 4h5a1 1 0 0 1 .85.5L16.3 6h2.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  design: <path d="M12 3l2.4 5 5.5.6-4.1 3.7 1.1 5.4L12 15.9 7.1 18.7l1.1-5.4L4.1 8.6 9.6 8z" />,
  douyin: <><path d="M9 8v8.5A3.5 3.5 0 1 1 5.5 13" /><path d="M9 8c0 2.5 2 4.5 5 4.5V9.2A4.2 4.2 0 0 1 15 4h-3" /></>,
  editing: <><path d="M4 5h16M4 10h10M4 15h16M4 19h8" /><path d="M16.5 13.5l4 4-2.5 1-1-2.5z" /></>,
  operation: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></>,
  wechat: <><path d="M20 12.5c0-3-2.9-5.5-6.5-5.5S7 9.5 7 12.5 9.9 18 13.5 18c.9 0 1.7-.1 2.5-.4l2.5 1.1-.7-2.1c1.4-1 2.2-2.5 2.2-4.1z" /><path d="M7 12.5C4.8 12 3.2 10.4 3.2 8.5 3.2 6 5.6 4 8.5 4c2.3 0 4.3 1.3 5 3.1" /></>,
  general: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.4 3.4 5.6 3.4 9s-1.2 6.6-3.4 9c-2.2-2.4-3.4-5.6-3.4-9S9.8 5.4 12 3z" /></>,
};

export const DeptIcon = ({ k, ...p }: { k: string } & SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>{DEPT[k] ?? DEPT.general}</svg>
);

// 工作内容 / 功能图标
const FEATURE: Record<string, JSX.Element> = {
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3" /></>,
  pen: <><path d="M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16z" /><path d="M14.5 6.5l3 3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3.2 3.2 0 0 1 0 5.6M17 20a5.5 5.5 0 0 0-2.5-4.6" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  layout: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M10 9v11" /></>,
  megaphone: <><path d="M4 10v4a1 1 0 0 0 1 1h3l7 4V5L8 9H5a1 1 0 0 0-1 1z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  chat: <><path d="M4 5h16v11H9l-4 4V5z" /><path d="M8 9h8M8 12h5" /></>,
  link: <><path d="M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1.5" /><path d="M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6h1.5" /></>,
};

export const FeatureIcon = ({ k, ...p }: { k: string } & SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>{FEATURE[k] ?? FEATURE.sparkle}</svg>
);
