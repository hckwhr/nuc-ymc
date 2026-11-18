import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const environment = (import.meta as unknown as { env: Record<string, string> }).env;
export const API = (environment.VITE_API_URL || (environment.MODE === "development" ? "" : "https://api.nuc-ymc.com")).replace(/\/$/, "");
export const CONSENT = "2026-11-18";
export type User = { id: string; username: string; nickname: string; role: "owner" | "admin" | "user"; department?: string | null; disabled: number; created_at: number; last_login: number | null; must_change_password: number };
export type Work = { id: string; creator_id?: string; user_id?: string; title: string; description: string; category: string; branch: string; status: string; reason?: string; nickname: string; username?: string; images: string[]; created_at: number; updated_at: number; featured?: boolean; published_at?: number | null };
export type Page<T> = { items: T[]; total: number; page: number };
export const roleName = { owner: "总管理员", admin: "管理员", user: "创作者" };
export const statusName: Record<string, string> = { pending: "待审核", approved: "已公开", rejected: "已退回", deleted: "已删除" };
export const dateText = (value: number | null) => value ? new Date(value * 1000).toLocaleString("zh-CN") : "暂无";
let csrfToken = "";

export function uploadWithProgress(path: string, data: FormData, progress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/api${path}`); xhr.withCredentials = true; xhr.timeout = 180000;
    if (csrfToken) xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error("网络连接中断，填写内容已保留。请先检查“我的作品”是否已提交成功，再重试。"));
    xhr.ontimeout = () => reject(new Error("提交等待超时，填写内容已保留。请先检查“我的作品”是否已提交成功，再重试。"));
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(typeof result.detail === "string" ? result.detail : "提交失败，请检查填写内容后重试"));
      } catch { reject(new Error("服务暂时无法处理，填写内容已保留，请稍后重试")); }
    };
    xhr.send(data);
  });
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try {
    response = await fetch(`${API}/api${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new Error("无法连接服务，请稍后重试");
  }
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("账号服务尚未接通，请稍后再试");
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "请求未成功，请检查填写内容");
  return result as T;
}

type Auth = { user: User | null; loading: boolean; error: string; refresh: () => Promise<void>; login: (username: string, password: string, register?: boolean) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const response = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (response.status === 401) { setUser(null); csrfToken = ""; setError(""); return; }
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("账号服务尚未接通");
      const result = await response.json();
      setUser(result.user); csrfToken = result.csrf; setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "无法连接账号服务"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function login(username: string, password: string, register = false) {
    const result = await api<{ user: User; csrf: string }>(register ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify({ username, password, consent: CONSENT }) });
    csrfToken = result.csrf;
    const session = await api<{ user: User; csrf: string }>("/auth/me");
    setUser(session.user); csrfToken = session.csrf; setError("");
  }
  async function logout() { await api("/auth/logout", { method: "POST" }); setUser(null); csrfToken = ""; }
  return <AuthContext.Provider value={{ user, loading, error, refresh, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider missing");
  return auth;
}
