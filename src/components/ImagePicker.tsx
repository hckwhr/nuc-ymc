import { useEffect, useState } from "react";
import { API } from "../lib/community";

export type PickedImage = { key: string; id?: string; file?: File };
export function ImagePicker({ items, onChange, disabled = false }: { items: PickedImage[]; onChange: (items: PickedImage[]) => void; disabled?: boolean }) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    const urls = Object.fromEntries(items.filter(item => item.file).map(item => [item.key, URL.createObjectURL(item.file!)]));
    setPreviews(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [items]);
  function move(index: number, target: number) {
    const next = [...items]; const [item] = next.splice(index, 1); next.splice(target, 0, item); onChange(next);
  }
  return <div className="image-picker">
    <label className="creative-dropzone"><span className="upload-symbol" aria-hidden="true">＋</span><strong>{items.length ? `已选择 ${items.length} / 6 张 · 继续添加` : "选择你的作品图片"}</strong><span>JPG / PNG / WebP · 每张不超过 8 MB · 第一张为封面</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} onChange={e => {
      const files = Array.from(e.target.files || []); e.target.value = ""; setError("");
      if (items.length + files.length > 6) { setError("最多 6 张图片，请先移除不需要的图片"); return; }
      if (files.some(file => file.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("请选择 JPG、PNG 或 WebP 图片，每张不超过 8 MB"); return; }
      onChange([...items, ...files.map(file => ({ key: crypto.randomUUID(), file }))]);
    }} /></label>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="editable-previews">{items.map((item, index) => <figure key={item.key}>
      <img src={item.id ? `${API}/api/images/${item.id}` : previews[item.key]} alt={`第 ${index + 1} 张${index === 0 ? " · 封面" : ""}`} />
      <figcaption>{index === 0 && <strong>封面 · </strong>}{item.file?.name || `原作品图片 ${index + 1}`}</figcaption>
      <div className="image-tools"><button type="button" disabled={disabled || index === 0} onClick={() => move(index, 0)}>设为封面</button><button type="button" disabled={disabled || index === 0} aria-label={`第 ${index + 1} 张前移`} onClick={() => move(index, index - 1)}>←</button><button type="button" disabled={disabled || index === items.length - 1} aria-label={`第 ${index + 1} 张后移`} onClick={() => move(index, index + 1)}>→</button><button type="button" className="danger" disabled={disabled} aria-label={`移除第 ${index + 1} 张`} onClick={() => onChange(items.filter((_, i) => i !== index))}>移除</button></div>
    </figure>)}</div>
  </div>;
}

export function UploadProgress({ value }: { value: number }) {
  return <div className="upload-progress" role="status"><progress value={value} max={100} /><span>{value < 100 ? `正在上传 ${value}%` : "图片已传送，正在安全处理和保存…"}</span></div>;
}
