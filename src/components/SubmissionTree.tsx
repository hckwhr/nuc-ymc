import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useCategories, type Department } from "../lib/categories";
import { uploadWithProgress } from "../lib/community";
import { photographyImages, designImages, douyinDaily } from "../data/media";

import { ImagePicker, UploadProgress, type PickedImage } from "./ImagePicker";
import { draftKey, readDraft } from "../lib/submissionDraft";

const appearance = {
  photography: { color: "#38BDF8", tint: "#EAF7FE", image: photographyImages[0], subtitle: "定格光影，收藏瞬间" },
  design: { color: "#FF7A59", tint: "#FFF0EA", image: designImages[0], subtitle: "让想象拥有形状" },
  douyin: { color: "#FB6F92", tint: "#FFF0F5", image: douyinDaily[0], subtitle: "记录校园的每一帧" },
};

export function DepartmentFilters({ category, branch, onChange, onlyDepartment }: {
  category: string; branch: string; onChange: (category: string, branch: string) => void; onlyDepartment?: string | null;
}) {
  const { departments } = useCategories();
  return <div className="department-filters">
    <label>投稿部门<select value={category} onChange={e => onChange(e.target.value, "")}>
      {!onlyDepartment && <option value="">全部部门</option>}
      {Object.entries(departments).filter(([key]) => !onlyDepartment || key === onlyDepartment).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
    </select></label>
    <label>作品分支<select value={branch} disabled={!category} onChange={e => onChange(category, e.target.value)}>
      <option value="">全部分支</option>
      {category && departments[category as Department].branches.map(name => <option key={name}>{name}</option>)}
    </select></label>
  </div>;
}

export function SubmissionTree({ onSubmitted, userId }: { onSubmitted: (id: string) => void; userId: string }) {
  const { departments, error: categoryError } = useCategories();
  const [initial] = useState(() => readDraft(userId));
  const [department, setDepartment] = useState<Department | null>(() => Object.prototype.hasOwnProperty.call(appearance, initial.draft.department) ? initial.draft.department as Department : null);
  const [branch, setBranch] = useState(initial.draft.branch);
  const [title, setTitle] = useState(initial.draft.title), [description, setDescription] = useState(initial.draft.description);
  const [missingImages, setMissingImages] = useState(initial.draft.imageNames);
  const [draftMessage, setDraftMessage] = useState(initial.message);
  const skipSave = useRef(true);
  const [items, setItems] = useState<PickedImage[]>([]);
  const [step, setStep] = useState(1);
  const [rights, setRights] = useState(false);
  const submitting = useRef(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const branchHeading = useRef<HTMLHeadingElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    try {
      if (!title && !description && !department && !branch && !items.length && !missingImages.length) localStorage.removeItem(draftKey(userId));
      else localStorage.setItem(draftKey(userId), JSON.stringify({ title, description, department: department || "", branch, imageNames: items.length ? items.map(item => item.file!.name) : missingImages }));
      setDraftMessage("文字和分类已保存到当前浏览器，图片文件未保存。共用设备使用后请清空草稿。");
    } catch { setDraftMessage("本地草稿保存失败，请勿关闭页面，先复制文字留存。"); }
  }, [userId, title, description, department, branch, items, missingImages]);
  useEffect(() => {
    if (!items.length && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [items.length, busy]);

  function clearDraft() {
    setTitle(""); setDescription(""); setDepartment(null); setBranch(""); setItems([]); setMissingImages([]); setRights(false); setStep(1); form.current?.reset();
  }

  function chooseDepartment(value: Department) {
    setDepartment(value); setBranch(""); setError(""); setSuccess("");
    requestAnimationFrame(() => branchHeading.current?.focus({ preventScroll: true }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(""); setSuccess("");
    if (!department || !departments[department].branches.includes(branch)) { setError("分支已调整，请重新选择投稿分支"); return; }
    if (!items.length || items.length > 6) {
      setError("请选择 1 至 6 张图片，每张不超过 8 MB"); return;
    }
    if (!title.trim()) { setError("请给作品填写一个标题"); setStep(2); return; }
    if (step === 2) { setStep(3); return; }
    if (step !== 3 || !rights) { setError("请先确认作品授权"); return; }
    const data = new FormData();
    data.set("title", title.trim()); data.set("description", description.trim());
    data.set("category", department); data.set("branch", branch); data.set("rights", "true");
    items.forEach(item => data.append("files", item.file!));
    submitting.current = true; setBusy(true); setProgress(0);
    try {
      const result = await uploadWithProgress("/works", data, setProgress);
      setSuccess(`已提交到${departments[department].name} · ${branch}，可在“我的作品”查看审核结果。`);
      clearDraft(); onSubmitted(result.id);
    } catch (error) { setError((error as Error).message); }
    finally { submitting.current = false; setBusy(false); }
  }

  const theme = department ? appearance[department] : null;
  return <section className="submission-tree" aria-labelledby="submission-heading" style={{ "--branch-color": theme?.color || "#1A1A1A", "--branch-tint": theme?.tint || "#FFFFFF" } as CSSProperties}>
    <div className="tree-intro"><span className="tree-root-dot" /><h2 id="submission-heading">你的作品，从这里出发</h2><p>为灵感找到归属，再让作品被看见。</p></div>
    <ol className="submission-steps" aria-label="投稿步骤">{["选择归属", "整理作品", "预览提交"].map((name, index) => <li key={name} aria-current={step === index + 1 ? "step" : undefined}><span>{index + 1}</span>{name}</li>)}</ol>
    <div className="draft-notice"><p role="status">{draftMessage}</p><button type="button" disabled={busy} onClick={() => { if (window.confirm("清空当前文字草稿及已选图片？此操作不会删除已提交的作品。")) clearDraft(); }}>清空草稿</button></div>
    {missingImages.length > 0 && <p className="notice">上次选择的图片需要重新添加：{missingImages.join("、")}。请核对张数和封面后再提交。<button type="button" disabled={busy} onClick={() => setMissingImages([])}>知道了</button></p>}
    {department && branch && !departments[department].branches.includes(branch) && <p className="notice">原分支“{branch}”已调整，请在下方重新选择，文字已保留。</p>}
    {categoryError && <p className="notice" role="status">{categoryError}</p>}
    <div hidden={step !== 1}>
    <div className="department-nodes" aria-label="选择投稿部门">
      {(Object.keys(departments) as Department[]).map(key => <div className={`department-path ${department === key ? "selected" : ""}`} key={key} style={{ "--node-color": appearance[key].color } as CSSProperties}>
        <button type="button" className="department-node" aria-pressed={department === key} aria-controls="submission-branches" disabled={busy} onClick={() => chooseDepartment(key)}>
          <img src={appearance[key].image} alt="" className="department-art" />
          <span className="department-node-content"><span className="department-node-title">{departments[key].name}<span aria-hidden="true">↗</span></span><span className="department-node-subtitle">{appearance[key].subtitle}</span></span>
        </button>
      </div>)}
    </div>
    <div id="submission-branches" className="branch-stage">
      {department && <div key={department} className="branch-expansion">
        <svg className="branch-junction" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><path className="junction-desktop" d={`M ${department === "photography" ? 16.67 : department === "douyin" ? 83.33 : 50} 0 V 18 H 50 V 36`} /><path className="junction-mobile" d="M 50 0 V 36" /></svg>
        <h3 ref={branchHeading} tabIndex={-1}>{departments[department].name}<span>选择一个作品分支</span></h3>
        <div className="branch-nodes" aria-label="选择作品分支">{departments[department].branches.map(name => <button type="button" key={name} className={branch === name ? "selected" : ""} aria-pressed={branch === name} disabled={busy} onClick={() => { setBranch(name); setError("");  }}><span className="branch-dot" />{name}</button>)}</div>
      </div>}
    </div>
    <div className="submission-footer"><span>先选择部门，再选择旗下分支。</span><button className="primary" type="button" disabled={!department || !departments[department].branches.includes(branch) || busy} onClick={() => { setStep(2); setError(""); requestAnimationFrame(() => titleInput.current?.focus()); }}>下一步：整理作品 →</button></div>
    </div>
    <form ref={form} onSubmit={submit} className="tree-upload-form" hidden={step === 1}>
      <fieldset disabled={busy}>
        <div className="submission-destination"><span>投稿到</span><strong>{department && departments[department].name}</strong><span aria-hidden="true">→</span><strong>{branch}</strong><button type="button" onClick={() => { setStep(1); setRights(false); }}>重选分支</button></div>
        {step === 2 ? <>
        <label>给作品起个名字<input ref={titleInput} name="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="这一刻，你想留下什么？" required={step === 2} maxLength={100} /></label>
        <label>作品背后的故事<textarea name="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="聊聊灵感、拍摄地点，或你想表达的故事（选填）" maxLength={2000} rows={3} /></label>
        </> : <div className="submission-preview"><p className="eyebrow">提交前最后看一眼</p><h3>{title}</h3><p>{description || "未填写作品介绍"}</p><small>共 {items.length} 张图片 · 第一张为封面，按下方顺序展示</small></div>}
        <ImagePicker items={items} onChange={setItems} disabled={busy} readOnly={step === 3} />
        {department === "douyin" && <p className="upload-format-note">当前支持封面、分镜和图文素材。视频文件上传暂未开放。</p>}

        {step === 3 && <label className="checkbox-label"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} required /><span>作品为本人原创或已获授权，同意投稿规则。</span></label>}
        <div className="submission-footer"><span>审核通过后在作品社区和所属部门公开；首页展示部分最新作品及精选。</span><div className="action-row"><button type="button" onClick={() => { setStep(step - 1); setError(""); }}>← {step === 3 ? "返回修改" : "重选归属"}</button><button className="primary" disabled={busy}>{busy ? "作品正在提交…" : step === 2 ? "下一步：预览作品 →" : error ? "重新提交审核 ↗" : "确认并提交审核 ↗"}</button></div></div>

      </fieldset>
      {busy && <UploadProgress value={progress} />}
    </form>
    {error && <div className="notice error" role="alert">{error} <a href="#my-works">先检查我的作品 ↓</a></div>}
    {success && <p className="notice submission-success" role="status">{success} <a href="#my-works">查看本次投稿 ↓</a></p>}
  </section>;
}
