import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, API, dateText, statusName, uploadWithProgress, useAuth, type Page } from "../lib/community";
import { fileSize } from "../lib/study";

export type StudyDocument = { id: string; title: string; description: string; course: string; filename: string; format: string; size: number; status: string; reason: string; created_at: number; updated_at: number; nickname: string; username?: string; preview_text?: string };
export function StudySubmissions({ mode = "public", userId = "" }: { mode?: "public" | "mine" | "admin"; userId?: string }) {
  const [params] = useSearchParams();
  const [courses, setCourses] = useState<string[]>([]);
  const [course, setCourse] = useState(mode === "public" ? params.get("course") || "" : "");
  useEffect(() => { let active = true; api<string[]>("/study/courses").then(value => { if (active) setCourses(value); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => { if (mode === "public") { setCourse(params.get("course") || ""); setPage(1); } }, [mode, params.get("course")]);
  const [data, setData] = useState<Page<StudyDocument>>({items:[],total:0,page:1});
  const [page,setPage] = useState(1), [version,setVersion] = useState(0);
  const [query,setQuery] = useState(""), [search,setSearch] = useState(""), [status,setStatus] = useState(mode === "admin" && !userId ? "pending" : "");
  const [error,setError] = useState(""), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const [decision,setDecision] = useState<{file:StudyDocument;status:string}|null>(null), [reason,setReason]=useState("");
  useEffect(() => {
    let active=true; setLoading(true);setError("");
    const endpoint=mode === "admin" ? "/admin/study" : mode === "mine" ? "/my/study" : "/study/documents";
    api<Page<StudyDocument>>(`${endpoint}?${new URLSearchParams({page:String(page),q:search,status,course,user_id:userId})}`).then(result=>{if(active)setData(result); if (active && page > 1 && !result.items.length) setPage(Math.max(1, Math.ceil(result.total / 24)));}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[mode,page,version,search,status,course,userId]);
  async function moderate(file:StudyDocument, next:string, why="") {
    setBusy(true);setError("");
    try { await api(`/admin/study/${file.id}`,{method:"PATCH",body:JSON.stringify({status:next,reason:why,revision:file.updated_at})});setDecision(null);setVersion(v=>v+1); window.dispatchEvent(new Event("study-moderated")); }
    catch(e){setError((e as Error).message);} finally{setBusy(false);}
  }
  const btn="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm hover:bg-indigo-50 disabled:opacity-40";
  return <section id="shared-documents" className="mt-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">{mode==="admin"?"学习资料审核":mode==="mine"?"我分享的资料":"同学分享"}</h2><button className={btn} disabled={loading} onClick={()=>setVersion(v=>v+1)}>刷新资料</button></div>
    {mode === "public" && <p className="mt-3 text-sm text-soft">同学上传的资料经审核后显示在这里。<Link className="text-indigo-600 underline" to="/study/submit">我也来分享</Link></p>}
    <form className="my-5 flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();setSearch(query);setPage(1);}}><label className="min-w-0 flex-1"><span className="sr-only">搜索分享资料</span><input value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder={mode === "admin" ? "搜索标题、文件名、昵称或用户名" : "搜索标题、文件名或分享者"} className="w-full rounded-xl border border-line bg-surface p-3 text-sm" /></label><button className={btn}>搜索</button><select aria-label="分享资料课程" className={btn} value={course} onChange={e=>{setCourse(e.target.value);setPage(1);}}><option value="">全部课程</option>{courses.map(name=><option key={name}>{name}</option>)}</select>{mode!=="public"&&<select aria-label="资料审核状态" className={btn} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">全部状态</option>{Object.entries(statusName).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>}{(course || search || status) && <button type="button" className={btn} onClick={()=>{setCourse("");setQuery("");setSearch("");setStatus("");setPage(1);}}>清除筛选</button>}</form>
    {error&&<p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading?<p role="status" className="my-6">正在加载分享资料…</p>:<><ul className="mt-5 grid gap-4 md:grid-cols-2">{data.items.map(file=><li key={file.id} className="min-w-0 rounded-2xl border border-line bg-surface p-5"><p className="text-xs text-indigo-600">{file.course} · {file.format.toUpperCase()} · {fileSize(file.size)} · {statusName[file.status]}</p><h3 className="mt-3 break-words text-lg">{file.title}</h3><p className="mt-2 text-sm text-soft">{file.nickname}{file.username?` · @${file.username}`:""} · {dateText(file.created_at)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{file.description}</p><p className="mt-2 break-all text-xs text-soft">{file.filename}</p>{file.reason&&<p className="mt-3 rounded-lg bg-background p-3 text-sm">处理说明：{file.reason}</p>}
      {file.status!=="deleted"&&<div className="mt-4 flex flex-wrap gap-2">{["pdf","doc","docx"].includes(file.format)&&<Link className={btn} to={`/study/shared/${file.id}`}>在线阅读</Link>}<a className={btn} href={`${API}/api/study/documents/${file.id}/file`}>下载原文件</a>{mode==="mine"&&<button className={`${btn} text-red-700`} disabled={busy} onClick={async()=>{if(!confirm(`删除《${file.title}》？删除后将停止展示。`))return;setBusy(true);try{await api(`/study/documents/${file.id}`,{method:"DELETE"});setVersion(v=>v+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>删除资料</button>}{mode==="admin"&&<>{file.status!=="approved"&&<button className={btn} disabled={busy} onClick={()=>void moderate(file,"approved")}>通过审核</button>}<button className={btn} disabled={busy} onClick={()=>{setDecision({file,status:"rejected"});setReason("");}}>退回</button><button className={`${btn} text-red-700`} disabled={busy} onClick={()=>{setDecision({file,status:"deleted"});setReason("");}}>删除</button></>}</div>}
    </li>)}</ul>{!data.total&&!error&&<p className="my-6 rounded-2xl border border-dashed border-line p-8 text-center text-soft">{mode==="public"?(course || search ? "没有匹配的分享资料，试试其他课程或关键词。" : "还没有通过审核的分享，欢迎贡献第一份资料。"):"暂无符合条件的资料。"}</p>}<div className="mt-6 flex flex-wrap items-center gap-3 text-sm"><span>共 {data.total} 份 · 第 {page} 页</span><button className={btn} disabled={page===1} onClick={()=>setPage(p=>p-1)}>上一页</button><button className={btn} disabled={page*24>=data.total} onClick={()=>setPage(p=>p+1)}>下一页</button></div></>}
    {decision&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-5"><form role="dialog" aria-modal="true" aria-label="处理学习资料" className="w-full max-w-lg rounded-2xl bg-surface p-6" onSubmit={e=>{e.preventDefault();void moderate(decision.file,decision.status,reason);}}><h3 className="text-xl">{decision.status==="deleted"?"删除":"退回"}《{decision.file.title}》</h3><label className="mt-5 block">处理原因<textarea autoFocus required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded border border-line p-3" /></label>{error&&<p role="alert">{error}</p>}<div className="mt-5 flex gap-3"><button className={btn} type="button" disabled={busy} onClick={()=>setDecision(null)}>取消</button><button className={btn} disabled={busy||!reason.trim()}>确认处理</button></div></form></div>}
  </section>;
}

export function StudyUpload() {
  const {user}=useAuth();
  const [courses,setCourses]=useState<string[]>([]),[course,setCourse]=useState("");
  const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[file,setFile]=useState<File|null>(null);
  const [rights,setRights]=useState(false),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [version,setVersion]=useState(0),[inputKey,setInputKey]=useState(0);
  useEffect(()=>{api<string[]>("/study/courses").then(setCourses).catch(e=>setError(e.message));},[]);
  useEffect(()=>{if(!busy)return;const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener("beforeunload",leave);return()=>window.removeEventListener("beforeunload",leave);},[busy]);
  async function submit(event:FormEvent) {
    event.preventDefault();setError("");setMessage("");
    if(!file||!rights||!course){setError("请选择课程、文件并确认分享权限。");return;}
    if(file.size>40*1024*1024){setError("单份资料不能超过 40 MB。");return;}
    setBusy(true);setProgress(0);
    const body=new FormData();body.set("title",title);body.set("description",description);body.set("course",course);body.set("rights","true");body.set("file",file);
    try{await uploadWithProgress("/study/documents",body,setProgress);setMessage("资料已提交审核，通过后会显示在学习书架的“同学分享”中。");setTitle("");setDescription("");setFile(null);setRights(false);setInputKey(k=>k+1);setVersion(v=>v+1);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const input="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3";
  return <><p className="mb-6 leading-7 text-soft">分享部门内的课程笔记、复习资料与学习方法。每次上传一份，单份最多 40 MB；审核结果可在下方查看。Word 文字预览不保留公式和图片版式，建议将这类资料转为 PDF 后分享。</p><form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-6"><fieldset disabled={busy} className="space-y-5"><label className="block">课程<select className={input} required value={course} onChange={e=>setCourse(e.target.value)}><option value="">先选择课程</option>{courses.map(name=><option key={name}>{name}</option>)}</select></label><label className="block">资料标题<input className={input} required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：大学物理上 · 期末复习笔记" /></label><label className="block">资料说明<textarea className={input} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="适合哪些课程、包含哪些内容？" /></label><label className="block">选择文件<input key={inputKey} className={input} type="file" required accept=".pdf,.doc,.docx,.zip,.rar" onChange={e=>setFile(e.target.files?.[0]||null)} /><span className="mt-2 block text-sm text-soft">PDF / Word 可阅读，ZIP / RAR 下载后解压。{file&&`已选择 ${fileSize(file.size)}`}</span></label><label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" required checked={rights} onChange={e=>setRights(e.target.checked)} /><span>我有权分享该资料，已检查内容，不包含他人的个人信息或恶意程序，并同意审核后展示。</span></label><button className="rounded-full bg-indigo-600 px-6 py-3 text-white" disabled={busy||!user}>{busy?`正在上传 ${progress}%` : "提交资料"}</button></fieldset>{busy&&<progress aria-label="资料上传进度" className="mt-4 w-full" max={100} value={progress} />}{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 text-indigo-600">{message}</p>}</form><StudySubmissions key={version} mode="mine" /></>;
}
