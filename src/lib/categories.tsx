import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import defaults from "../../server/categories.json";
import { api } from "./community";

export type Department = keyof typeof defaults;
export type Categories = Record<Department, { name: string; branches: string[]; counts?: Record<string, number>; aliases?: Record<string, string> }>;
export const departmentNames = defaults;
const Context = createContext<{ departments: Categories; error: string; refresh: () => Promise<void> } | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Categories>(defaults);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const update = () => api<Categories>("/categories").then(data => { if (active) { setDepartments(data); setError(""); } }).catch(() => { if (active) setError("分支列表暂未更新，请稍后重试。"); });
    void update();
    const timer = window.setInterval(() => { if (!document.hidden) void update(); }, 60000);
    window.addEventListener("focus", update);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  async function refresh() {
    const data = await api<Categories>("/categories");
    setDepartments(data); setError("");
  }
  return <Context.Provider value={{ departments, error, refresh }}>{children}</Context.Provider>;
}

export function useCategories() {
  const value = useContext(Context);
  if (!value) throw new Error("CategoriesProvider missing");
  return value;
}
