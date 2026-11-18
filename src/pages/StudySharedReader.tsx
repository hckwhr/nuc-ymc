import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, API } from "../lib/community";
import type { StudyDocument } from "../components/StudySubmissions";
import StudyReader from "./StudyReader";

export default function StudySharedReader() {
  const { id }=useParams();
  const [file,setFile]=useState<StudyDocument|null>(null),[error,setError]=useState("");
  useEffect(()=>{let active=true;setFile(null);setError("");api<StudyDocument>(`/study/documents/${id}`).then(data=>{if(active)setFile(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
  const document=useMemo(()=>file?{id:file.id,name:file.title,course:file.course,format:file.format,url:`${API}/api/study/documents/${file.id}/file`,preview:`${API}/api/study/documents/${file.id}/file`}:undefined,[file]);
  if(file?.format==="pdf")return <StudyReader document={document} />;
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-8"><nav className="mb-8 flex flex-wrap gap-6 text-sm text-indigo-600"><Link to="/">主站首页</Link><Link to="/study#shared-documents">返回学习书架</Link><Link to="/study/submit">我的资料</Link></nav>{error?<p role="alert">{error}</p>:!file?<p role="status">正在加载资料…</p>:<><p className="text-sm text-indigo-600">内部学习共享 · {file.course}</p><h1 className="mt-4 break-words text-3xl">{file.title}</h1><p className="mt-3 text-soft">分享者：{file.nickname}</p><a href={document?.url} className="my-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-white">下载原文件</a>{["doc","docx"].includes(file.format)?<><p className="mb-5 rounded-xl border border-line p-4 text-sm leading-7 text-soft">当前为 Word 文字预览，公式、图片和表格版式请下载原文件查看。若需完整在线版式，分享时可改用 PDF。</p><article className="whitespace-pre-wrap break-words rounded-2xl border border-line bg-surface p-5 leading-8 sm:p-10">{file.preview_text}</article></>:<p>压缩包请下载后解压。</p>}</>}</main>;
}
