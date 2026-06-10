import { useState } from "react";
import { Icons } from "./Icons";
import { authAPI, setToken } from "../services/api";

export default function AdminLoginModal({ onClose, onLogin }) {
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !pass) { setErr("Please fill in both fields."); return; }

    setLoading(true);
    try {
      const data = await authAPI.login(email, pass);
      // Store JWT so all subsequent API calls are authenticated
      setToken(data.token);
      onLogin(data.admin);
    } catch (error) {
      setErr(error.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-box">
        <div className="modal-top">
          <button className="modal-close" onClick={onClose} aria-label="Close">
            {Icons.x}
          </button>
          <div className="modal-icon-wrap">{Icons.lock}</div>
          <div className="modal-title">Admin Login</div>
          <div className="modal-sub">India's First Movers Group Control Panel</div>
        </div>

        <div className="modal-body">
          <form onSubmit={handle}>
            <div className="form-row">
              <label className="form-lbl">Email Address</label>
              <input
                className={`form-inp${err ? " err" : ""}`}
                type="email"
                placeholder="admin@ifmg.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-row">
              <label className="form-lbl">Password</label>
              <input
                className={`form-inp${err ? " err" : ""}`}
                type="password"
                placeholder="Enter password"
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
              {err && (
                <div className="err-msg">
                  {Icons.alertCircle}
                  {err}
                </div>
              )}
            </div>
            <button className="btn-login" type="submit" disabled={loading}>
              {loading
                ? <><span className="spin-icon">{Icons.loader}</span> Signing in…</>
                : <>{Icons.chevronRight} Sign In</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}