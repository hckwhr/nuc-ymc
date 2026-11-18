export type SubmissionDraft = { title: string; description: string; department: string; branch: string; imageNames: string[] };
export const emptyDraft: SubmissionDraft = { title: "", description: "", department: "", branch: "", imageNames: [] };
export const draftKey = (userId: string) => `ymc:submission-draft:v1:${userId}`;

export function readDraft(userId: string): { draft: SubmissionDraft; message: string } {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return { draft: emptyDraft, message: "文字和分类会自动保存到当前浏览器。图片刷新后需重新选择。" };
    const value = JSON.parse(raw);
    if (!value || typeof value.title !== "string" || typeof value.description !== "string" || typeof value.department !== "string" || typeof value.branch !== "string" || !Array.isArray(value.imageNames)) throw new Error();
    return { draft: { title: value.title.slice(0, 100), description: value.description.slice(0, 2000), department: value.department, branch: value.branch.slice(0, 30), imageNames: value.imageNames.filter((name: unknown) => typeof name === "string").slice(0, 6) }, message: "已恢复本账号的文字草稿，请重新确认分支和作品授权。" };
  } catch { return { draft: emptyDraft, message: "无法读取本地草稿，请保留好填写内容。" }; }
}
