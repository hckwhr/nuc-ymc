import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { DeptIcon, IconArrow } from "../lib/icons";
import groupQr from "../assets/study-qq-group.png";

const DRIVE = "https://pan.baidu.com/s/1do7EMwEjXiCpMR8SPQhWFg?pwd=2k5j";
const groups = [
  { name: "数理基础", courses: ["大学物理（上）", "大学物理（下）", "大学物理实验", "复变函数", "概率论"] },
  { name: "电子与电路", courses: ["电路", "模拟电子技术", "数字电子技术", "高频电子线路", "传感器", "电磁场与电磁波"] },
  { name: "信号与通信", courses: ["信号与系统", "数字信号处理", "通信原理"] },
  { name: "计算机与编程", courses: ["计算机组成原理", "微机原理", "Python 与数据结构"] },
  { name: "思政与理论学习", courses: ["马克思主义基本原理", "习近平思想", "党课"] },
];

export default function Study() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const previous = document.title; document.title = "学习部 · 学习资料共享 · 青年媒体中心";
    return () => { document.title = previous; };
  }, []);
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label}已复制。`); }
    catch { setMessage(`请长按或选中复制${label}：${value}`); }
  }
  const button = "inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium transition-colors hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600";
  return <div className="min-h-screen bg-background text-ink">
    <header className="border-b border-line bg-surface"><nav aria-label="学习部导航" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5"><Link to="/" className="font-display text-xl">青年媒体中心</Link><div className="flex flex-wrap gap-6 text-sm text-soft"><Link to="/#departments">← 返回部门展示</Link><a href="#resources">课程资料</a><a href="#study-group">加入学习群</a></div></nav></header>
    <main className="mx-auto max-w-7xl px-6 pb-20">
      <section className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div><div className="mb-6 inline-flex items-center gap-3 rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-600"><DeptIcon k="study" width={20} height={20} />学习部 · STUDY</div><h1 className="font-display text-4xl leading-tight sm:text-6xl">学习路上，<br /><span className="text-indigo-600">一起多走一步。</span></h1><p className="mt-6 max-w-lg leading-8 text-soft">把课程资料整理在一起，把学习中的疑问带到群里。从课堂学习到复习巩固，在这里找到资料，也找到一起进步的同学。</p><div className="mt-8 flex flex-wrap gap-3"><a href={DRIVE} target="_blank" rel="noopener noreferrer" className={`${button} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}>打开百度网盘 <IconArrow width={16} height={16} /></a><a href="#resources" className={button}>浏览课程目录</a></div><p className="mt-4 text-sm text-soft">提取码 <strong className="select-all font-mono text-ink">2k5j</strong> · 链接已附带提取码</p></div>
        <aside className="rounded-3xl border border-line bg-surface p-8 sm:p-10"><p className="text-xs uppercase tracking-[0.25em] text-indigo-600">Study together</p><h2 className="mt-4 font-display text-3xl">大二学习资料</h2><p className="mt-4 leading-7 text-soft">按课程查找，按需要取用。课程目录根据现有资料文件夹整理，下载内容以网盘内实际文件为准。</p><div className="mt-8 grid grid-cols-2 gap-5 border-t border-line pt-6"><div><strong className="font-display text-4xl">20</strong><p className="mt-2 text-sm text-soft">课程分类</p></div><div><strong className="font-display text-4xl">05</strong><p className="mt-2 text-sm text-soft">学习方向</p></div></div></aside>
      </section>
      <section id="resources" className="scroll-mt-8"><p className="text-xs uppercase tracking-[0.25em] text-indigo-600">Course resources</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">你的课程，在这里找</h2><p className="mt-4 text-soft">在百度网盘中进入对应课程文件夹，即可查看和下载资料。</p><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{groups.map((group, index) => <article key={group.name} className="rounded-2xl border border-line bg-surface p-7"><span className="font-mono text-sm text-indigo-400">0{index + 1}</span><h3 className="mt-3 text-xl font-medium">{group.name}</h3><ul className="mt-5 flex flex-wrap gap-2">{group.courses.map(course => <li key={course} className="rounded-lg bg-background px-3 py-2 text-sm text-soft">{course}</li>)}</ul></article>)}</div></section>
      <section id="study-group" className="mt-16 grid scroll-mt-8 gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs uppercase tracking-[0.25em] text-indigo-600">Share & learn</p><h2 className="mt-3 font-display text-3xl">学习资料分享群</h2><p className="mt-5 max-w-xl leading-8 text-soft">交流课程问题、分享学习方法，也欢迎在群里补充资料和反馈目录问题。用 QQ 扫描二维码，或搜索下方群号申请加入。</p><p className="mt-5 text-lg">QQ群号：<strong className="select-all font-mono">884117516</strong></p><div className="mt-5 flex flex-wrap gap-3"><button className={button} onClick={() => void copy("884117516", "群号")}>复制群号</button><a className={button} href={groupQr} download="学习资料分享群.png">保存群二维码</a><button className={button} onClick={() => void copy("2k5j", "提取码")}>复制网盘提取码</button></div><p role="status" className="mt-4 min-h-6 text-sm text-indigo-600">{message}</p><p className="text-sm leading-6 text-soft">手机上可先保存二维码，再用 QQ 扫一扫从相册识别。若二维码失效，请尝试搜索群号。</p></div><img src={groupQr} alt="学习资料分享群 QQ 二维码，群号 884117516" width={254} height={315} className="mx-auto h-auto w-full max-w-[254px] rounded-2xl" /></section>
    </main><Footer />
  </div>;
}
