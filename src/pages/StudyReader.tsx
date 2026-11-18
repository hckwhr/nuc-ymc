import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDocument, GlobalWorkerOptions, version, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { studyFiles } from "../lib/study";

GlobalWorkerOptions.workerSrc = workerUrl;
const button = "rounded-full border border-line bg-surface px-4 py-2 text-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40";

export default function StudyReader({ document: supplied }: { document?: { id:string; name:string; course:string; format:string; url:string; preview:string } }) {
  const { id } = useParams();
  const file = supplied || studyFiles.find(item => item.id === id);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(700);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const rendering = useRef<RenderTask | null>(null);
  useEffect(() => {
    const previous = document.title;
    document.title = `${file?.name || "资料阅读"} · 内部学习共享`;
    return () => { document.title = previous; };
  }, [file]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, entries[0].contentRect.width - 24)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!file?.preview) return;
    let active = true;
    setPdf(null); setPage(1); setError(""); setLoading(true);
    const base = `/pdfjs/${version}/`;
    const task = getDocument({ url: file.preview, cMapUrl: base + "cmaps/", cMapPacked: true,
      standardFontDataUrl: base + "standard_fonts/", wasmUrl: base + "wasm/", iccUrl: base + "iccs/",
      withCredentials: true, disableAutoFetch: true, disableStream: true, rangeChunkSize: 262144 });
    task.promise.then(doc => { if (active) setPdf(doc); }).catch(() => { if (active) { setError("资料暂时未能加载，请重试或下载原文件阅读。"); setLoading(false); } });
    return () => { active = false; rendering.current?.cancel(); void task.destroy(); };
  }, [file, attempt]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let active = true;
    let task: RenderTask | null = null;
    const previous = rendering.current;
    previous?.cancel();
    setLoading(true); setError("");
    async function render() {
      try {
        await previous?.promise.catch(() => {});
        const pdfPage = await pdf!.getPage(page);
        if (!active || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: Math.min(width, 1000) / pdfPage.getViewport({ scale: 1 }).width * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const element = canvas.current;
        element.width = Math.floor(viewport.width * ratio); element.height = Math.floor(viewport.height * ratio);
        element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
        task = pdfPage.render({ canvas: element, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        rendering.current = task;
        await task.promise;
        if (active) setLoading(false);
      } catch (cause) {
        if (active && (cause as Error).name !== "RenderingCancelledException") { setError("这一页未能显示，请重试或下载原文件。"); setLoading(false); }
      }
    }
    void render();
    return () => { active = false; task?.cancel(); };
  }, [pdf, page, zoom, width]);
  if (!file?.preview) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl">这份资料不支持在线阅读</h1><Link className="mt-6 block text-indigo-600" to="/study#library">返回资料书架</Link></main>;
  return <div className="min-h-screen bg-background text-ink">
    <header className="border-b border-line bg-surface px-5 py-4"><nav className="mx-auto flex max-w-6xl flex-wrap gap-6 text-sm"><Link to="/">← 主站首页</Link><Link to="/study#library">返回资料书架</Link></nav></header>
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
      <p className="text-sm text-indigo-600">内部学习共享 · {file.course}</p><h1 className="mt-3 break-words text-xl leading-8 [overflow-wrap:anywhere]">{file.name}</h1>
      <p className="mt-2 text-sm leading-6 text-soft">{file.format === "pdf" ? "按页加载，较大资料的首次打开可能需要稍等。" : "Word 文档以 PDF 版式在线预览；编辑与核对排版请下载原文件。"}</p>
      <div className="sticky top-0 z-10 my-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-background/95 p-3">
        <button className={button} disabled={!pdf || page <= 1} onClick={() => setPage(value => value - 1)}>上一页</button>
        <label className="text-sm">第 <input aria-label="页码" type="number" min={1} max={pdf?.numPages || 1} value={page} disabled={!pdf} onChange={event => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 1 && n <= (pdf?.numPages || 1)) setPage(n); }} className="w-16 rounded border border-line bg-surface px-2 py-2" /> / {pdf?.numPages || "—"} 页</label>
        <button className={button} disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(value => value + 1)}>下一页</button>
        <label className="text-sm"><span className="sr-only">缩放</span><select aria-label="缩放" value={zoom} onChange={event => setZoom(Number(event.target.value))} className={button}><option value={1}>适合宽度</option><option value={1.5}>放大 150%</option><option value={2}>放大 200%</option></select></label>
        <a href={file.url} download={file.name} className={`${button} text-indigo-600`}>下载原文件</a>
      </div>
      <p role="status" className="mb-3 text-sm text-soft">{loading ? "正在加载页面…" : !error ? `已显示第 ${page} 页` : ""}</p>
      {error && <div role="alert" className="mb-4 rounded-xl border border-line bg-surface p-5"><p>{error}</p><button className={`${button} mt-3`} onClick={() => setAttempt(value => value + 1)}>重新加载</button></div>}
      <div ref={container} className="w-full overflow-auto rounded-xl border border-line bg-stone-200 p-3"><canvas ref={canvas} aria-label={`文档第 ${page} 页；文字阅读与辅助功能可下载原文件使用系统阅读器`} className="mx-auto bg-white shadow-sm" /></div>
      <p className="mt-5 text-sm leading-7 text-soft">本区用于青年媒体中心部门内同学交流分享。“学习部”为资料共享入口，非独立设置的部门。</p>
    </main>
  </div>;
}
