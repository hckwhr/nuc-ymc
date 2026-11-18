import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, useAuth } from "../lib/community";

export function NotificationLink() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    setUnread(0);
    if (!user || user.must_change_password) return;
    let active = true;
    const update = () => { if (!document.hidden) void api<{ unread: number }>("/notifications/unread").then(data => { if (active) setUnread(data.unread); }).catch(() => {}); };
    update();
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update); window.addEventListener("notifications-read", update);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", update); window.removeEventListener("notifications-read", update); };
  }, [user?.id, user?.must_change_password, pathname]);
  return user && !user.must_change_password ? <Link className="notification-link" to="/notifications">通知{unread > 0 && <span className="notification-count" aria-label={`${unread} 条未读`}>{unread > 99 ? "99+" : unread}</span>}</Link> : null;
}
