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

/** 路由切换时回到顶部（首页带 hash 时不干扰锚点滚动）。 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
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
    </>
  );
}
