import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import brandMark from "../assets/brand-mark.svg";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@college.edu");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api("/auth/login", { method: "POST", body: { email, password } }); localStorage.setItem("campusflow_token", result.token); localStorage.setItem("campusflow_user", JSON.stringify(result.user)); onLogin(result.user); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <main className="login-shell"><div className="login-brand"><span className="brand-mark"><img src={brandMark} alt="" /></span><span>campus<span>flow</span></span></div><div className="login-content"><div className="login-badge"><ShieldCheck size={15} /> COLLEGE ADMINISTRATION</div><h1>Welcome back</h1><p>Sign in to manage your campus.</p><form onSubmit={submit}><label className="form-field"><span>Email address</span><input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="form-field"><span>Password</span><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary login-button" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}</button></form><div className="login-demo"><strong>Development sign-in</strong><span>Sample accounts are created when you run the seed command.</span><small>Set unique seed passwords in backend/.env before running npm run seed.</small></div></div><span className="login-footer">© 2026 CampusFlow · College Management System</span></main>;
}
