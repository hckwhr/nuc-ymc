import { Link } from "react-router-dom";
import { CommunityLayout, LoginForm, PasswordForm } from "./Community";
import { useAuth } from "../lib/community";
import { StudyUpload } from "../components/StudySubmissions";

export default function StudySubmit() {
  const {user,loading}=useAuth();
  return <CommunityLayout><div className="page-heading"><div><p className="eyebrow">内部学习共享</p><h1>把好资料分享给同学</h1></div><Link className="button" to="/study">返回资料书架</Link></div>{loading?<p>正在确认登录状态…</p>:!user?<><p className="notice">使用网站现有账号登录后即可分享资料。</p><LoginForm /></>:user.must_change_password?<PasswordForm />:<StudyUpload />}</CommunityLayout>;
}
