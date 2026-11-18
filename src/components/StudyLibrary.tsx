import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { fileSize, studyFiles } from "../lib/study";

export function StudyLibrary() {
  const [params, setParams] = useSearchParams();
  const course = params.get("course") || "";
  const query = params.get("q") || "";
  const kind = params.get("kind") || "";
  const [notice, setNotice] = useState("");
  const courses = useMemo(() => [...new Set(studyFiles.map(file => file.course))].sort((a, b) => a.localeCompare(b, "zh-CN")), []);
  const files = studyFiles.filter(file => (!course || file.course === course) &&
    (!query.trim() || `${file.name} ${file.course}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
    (!kind || (kind === "archive" ? !file.preview : kind === "word" ? ["doc", "docx"].includes(file.format) : file.format === kind)));
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  const input = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm focus:outline-indigo-600";
  return <section id="library" className="mt-12 scroll-mt-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-3xl">资料书架</h2><p className="mt-3 text-sm leading-7 text-soft">PDF、Word 可在线阅读，也可下载原文件；压缩包请下载后解压。</p></div><span className="text-sm text-soft" role="status">找到 {files.length} / {studyFiles.length} 份资料</span></div>
    <div className="my-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
      <label><span className="sr-only">搜索资料</span><input type="search" value={query} onChange={event => change("q", event.target.value)} placeholder="搜索文件名或课程…" className={input} /></label>
      <label><span className="sr-only">课程筛选</span><select aria-label="课程筛选" value={course} onChange={event => change("course", event.target.value)} className={input}><option value="">全部课程</option>{courses.map(name => <option key={name}>{name}</option>)}</select></label>
      <label><span className="sr-only">文件类型</span><select aria-label="文件类型" value={kind} onChange={event => change("kind", event.target.value)} className={input}><option value="">全部格式</option><option value="pdf">PDF</option><option value="word">Word</option><option value="archive">压缩包</option></select></label>
    </div>
    {!files.length && <div className="rounded-2xl border border-line bg-surface p-10 text-center"><p>没有找到匹配的资料。</p><button className="mt-4 text-indigo-600 underline" onClick={() => setParams({})}>清除筛选</button></div>}
    <ul className="grid gap-3 md:grid-cols-2">{files.map(file => <li key={file.id} className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md bg-indigo-50 px-2 py-1 font-mono font-semibold text-indigo-600">{file.format.toUpperCase()}</span><span className="text-soft">{file.course} · {fileSize(file.bytes)}</span></div>
      <h3 className="break-words text-base leading-7 [overflow-wrap:anywhere]">{file.name}</h3>
      <div className="mt-auto flex flex-wrap items-center gap-4 pt-5 text-sm">{file.preview ? <Link className="rounded-full bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700" to={`/study/read/${file.id}`}>在线阅读</Link> : <span className="text-soft">压缩包 · 下载后解压</span>}<a className="rounded-full border border-line px-4 py-2 hover:bg-indigo-50" href={file.url} download={file.name} onClick={() => setNotice(`正在下载：${file.name}，请在浏览器下载列表查看进度。`)}>下载原文件</a></div>
    </li>)}</ul><p className="mt-4 text-sm text-soft" role="status">{notice}</p>
  </section>;
}
