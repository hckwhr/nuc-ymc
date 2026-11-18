import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useCategories, type Department } from "../lib/categories";
import { uploadWithProgress } from "../lib/community";
import { photographyImages, designImages, douyinDaily } from "../data/media";

import { ImagePicker, UploadProgress, type PickedImage } from "./ImagePicker";

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

export function SubmissionTree({ onSubmitted }: { onSubmitted: () => void }) {
  const { departments, error: categoryError } = useCategories();
  const [department, setDepartment] = useState<Department | null>(null);
  const [branch, setBranch] = useState("");
  const [items, setItems] = useState<PickedImage[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const branchHeading = useRef<HTMLHeadingElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  function chooseDepartment(value: Department) {
    setDepartment(value); setBranch(""); setError(""); setSuccess("");
    requestAnimationFrame(() => branchHeading.current?.focus({ preventScroll: true }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!department || !branch) { setError("请先选择投稿部门和分支"); return; }
    if (!items.length || items.length > 6) {
      setError("请选择 1 至 6 张图片，每张不超过 8 MB"); return;
    }
    const data = new FormData(event.currentTarget);
    items.forEach(item => data.append("files", item.file!));
    setBusy(true); setProgress(0);
    try {
      await uploadWithProgress("/works", data, setProgress);
      setSuccess(`已提交到${departments[department].name} · ${branch}，可在“我的作品”查看审核结果。`);
      form.current?.reset(); setItems([]); onSubmitted();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  const theme = department ? appearance[department] : null;
  return <section className="submission-tree" aria-labelledby="submission-heading" style={{ "--branch-color": theme?.color || "#1A1A1A", "--branch-tint": theme?.tint || "#FFFFFF" } as CSSProperties}>
    <div className="tree-intro"><span className="tree-root-dot" /><h2 id="submission-heading">你的作品，从这里出发</h2><p>选一个部门，为灵感找到归属。</p></div>
    {categoryError && <p className="notice" role="status">{categoryError}</p>}
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
        <div className="branch-nodes" aria-label="选择作品分支">{departments[department].branches.map(name => <button type="button" key={name} className={branch === name ? "selected" : ""} aria-pressed={branch === name} disabled={busy} onClick={() => { setBranch(name); setError(""); requestAnimationFrame(() => titleInput.current?.focus({ preventScroll: true })); }}><span className="branch-dot" />{name}</button>)}</div>
      </div>}
    </div>
    <form ref={form} onSubmit={submit} className="tree-upload-form" hidden={!branch}>
      <fieldset disabled={busy}>
        <div className="submission-destination"><span>投稿到</span><strong>{department && departments[department].name}</strong><span aria-hidden="true">→</span><strong>{branch}</strong><button type="button" onClick={() => { setBranch(""); branchHeading.current?.focus(); }}>重选分支</button></div>
        <input type="hidden" name="category" value={department || ""} /><input type="hidden" name="branch" value={branch} />
        <label>给作品起个名字<input ref={titleInput} name="title" placeholder="这一刻，你想留下什么？" required maxLength={100} /></label>
        <label>作品背后的故事<textarea name="description" placeholder="聊聊灵感、拍摄地点，或你想表达的故事（选填）" maxLength={2000} rows={3} /></label>
        <ImagePicker items={items} onChange={setItems} disabled={busy} />
        {department === "douyin" && <p className="upload-format-note">当前支持封面、分镜和图文素材。视频文件上传暂未开放。</p>}

        <label className="checkbox-label"><input type="checkbox" name="rights" value="true" required /><span>作品为本人原创或已获授权，同意投稿规则。</span></label>
        <div className="submission-footer"><span>审核通过后，将同步展示在首页作品墙、所属部门和作品社区。</span><button className="primary" disabled={busy}>{busy ? "作品正在提交…" : `提交到${branch}`}<span aria-hidden="true">↗</span></button></div>
      </fieldset>
      {busy && <UploadProgress value={progress} />}
    </form>
    {error && <p className="notice error" role="alert">{error}</p>}
    {success && <p className="notice submission-success" role="status">{success}</p>}
  </section>;
}
