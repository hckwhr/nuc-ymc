import { useState } from "react";
import { type User } from "../lib/community";
import { departmentNames } from "../lib/categories";

export function AdminScope({ target, busy, save }: { target: User; busy: boolean; save: (department: string | null) => Promise<boolean> }) {
  const [scope, setScope] = useState(target.department || "");
  return <div className="admin-scope"><label>管理范围 · {target.username}<select value={scope} disabled={busy} onChange={e => setScope(e.target.value)}><option value="">全站</option>{Object.entries(departmentNames).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label><button disabled={busy || scope === (target.department || "")} onClick={() => {
    if (window.confirm(`将 ${target.username} 的管理范围改为${scope ? departmentNames[scope as keyof typeof departmentNames].name : "全站"}？修改后该用户需要重新登录。`)) void save(scope || null);
  }}>保存管理范围</button></div>;
}
