import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import fields from "../../server/content-defaults.json";
import { api } from "./community";

export { fields as contentFields };
export type ContentKey = keyof typeof fields;
export type SiteContent = { revision: number; values: Record<ContentKey, string> };
const defaults = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])) as Record<ContentKey, string>;
const Context = createContext({ values: defaults, refresh: () => Promise.resolve() });
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState(defaults);
  async function refresh() { const result = await api<SiteContent>("/site-content"); setValues({ ...defaults, ...result.values }); }
  useEffect(() => {
    let active = true;
    const update = () => { if (!document.hidden) api<SiteContent>("/site-content").then(result => { if (active) setValues({ ...defaults, ...result.values }); }).catch(() => {}); };
    update(); const timer = window.setInterval(update, 60000); window.addEventListener("focus", update);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return <Context.Provider value={{ values, refresh }}>{children}</Context.Provider>;
}
export function useSiteContent() { return useContext(Context); }
