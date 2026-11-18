import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Photography from "./pages/Photography";
import Design from "./pages/Design";
import Douyin from "./pages/Douyin";
import Editorial from "./pages/Editorial";
import Operation from "./pages/Operation";
import WeChat from "./pages/WeChat";
import General from "./pages/General";
import Community, { Account, Privacy } from "./pages/Community";
import Admin from "./pages/Admin";
import Creator from "./pages/Creator";
import WorkDetail from "./pages/WorkDetail";
import Notifications from "./pages/Notifications";
import EditWork from "./pages/EditWork";
import { AuthProvider } from "./lib/community";
import { CategoriesProvider } from "./lib/categories";

/** 路由切换时回到顶部（首页带 hash 时不干扰锚点滚动）。 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
    else {
      let id: string;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const scroll = () => {
        const target = document.getElementById(id);
        if (!target) return false;
        target.scrollIntoView({ block: "start" });
        return true;
      };
      if (scroll()) return;
      const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      const timer = window.setTimeout(() => observer.disconnect(), 15000);
      return () => { observer.disconnect(); clearTimeout(timer); };
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <CategoriesProvider>
      <ScrollManager />
      <Routes>
        <Route path="/account/works/:id/edit" element={<EditWork />} />
        <Route path="/creators/:id" element={<Creator />} />
        <Route path="/works/:id" element={<WorkDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/community" element={<Community />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/" element={<Home />} />
        <Route path="/photography" element={<Photography />} />
        <Route path="/design" element={<Design />} />
        <Route path="/douyin" element={<Douyin />} />
        <Route path="/editorial" element={<Editorial />} />
        <Route path="/operation" element={<Operation />} />
        <Route path="/wechat" element={<WeChat />} />
        <Route path="/general" element={<General />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </CategoriesProvider>
    </AuthProvider>
  );
}
