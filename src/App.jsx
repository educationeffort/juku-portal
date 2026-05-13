// src/App.jsx — Firebase 本番版
import { useState, useRef, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL,
} from "firebase/storage";
import { auth, db, storage } from "./firebase";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const TODAY = new Date().toLocaleDateString("ja-JP", {
  year:"numeric", month:"long", day:"numeric", weekday:"long"
});
const SUB_TO_TYPE = { PDF:"class", スライド:"class", 動画:"class", 宿題:"hw", 解答:"answer" };
const SUB_TO_ICON = { PDF:"📄", スライド:"📊", 動画:"🎬", 宿題:"📝", 解答:"✅" };

async function isTeacherUid(uid) {
  const snap = await getDoc(doc(db, "config", "teacher"));
  if (!snap.exists()) return false;
  return (snap.data().teacherUids || []).includes(uid);
}

// ─────────────────────────────────────────
// CSS（デモ版と同じ — 省略せず全コピー）
// ─────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#eef2f7; --white:#fff;
  --navy:#1a3a5c; --navy2:#2a5080;
  --blue:#2e86de; --blue-lt:#ddeeff;
  --orange:#e67e22; --orange-lt:#fdebd0;
  --green:#27ae60; --green-lt:#d5f5e3;
  --purple:#7b52ab; --purple-lt:#ede8fd;
  --red:#e74c3c; --red-lt:#fde8e8;
  --gray:#6b7a8d; --border:#dde3ea; --text:#1a2535;
}
body{font-family:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.topbar{background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:58px;position:sticky;top:0;z-index:50;box-shadow:0 2px 12px rgba(0,0,0,.18)}
.topbar-left{display:flex;align-items:center;gap:10px}
.topbar-logo{font-size:22px;line-height:1}
.topbar-name{font-size:16px;font-weight:900;letter-spacing:.3px}
.topbar-right{display:flex;align-items:center;gap:10px}
.topbar-user{font-size:13px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
.btn-top{padding:7px 14px;background:rgba(255,255,255,.13);color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;flex-shrink:0}
.btn-top:hover{background:rgba(255,255,255,.22)}
.page{max-width:760px;margin:0 auto;padding:22px 16px 56px}
.hero{background:linear-gradient(130deg,var(--navy) 0%,var(--navy2) 100%);border-radius:18px;padding:24px 24px 20px;margin-bottom:26px;color:#fff;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;right:-20px;bottom:-20px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.06)}
.hero-name{font-size:20px;font-weight:900;margin-bottom:3px}
.hero-grade{font-size:13px;color:rgba(255,255,255,.6)}
.hero-date{font-size:12px;color:rgba(255,255,255,.4);margin-top:8px}
.section{margin-bottom:30px}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.sec-bar{width:5px;height:28px;border-radius:3px;flex-shrink:0}
.sec-bar-blue{background:var(--blue)}.sec-bar-orange{background:var(--orange)}
.sec-label{font-size:18px;font-weight:900}
.sec-count{margin-left:auto;font-size:12px;font-weight:700;background:#fff;color:var(--gray);padding:3px 11px;border-radius:20px;border:1px solid var(--border)}
.tiles{display:flex;flex-direction:column;gap:12px}
.tile{background:var(--white);border-radius:16px;display:flex;align-items:center;gap:14px;padding:18px;cursor:pointer;border:2px solid transparent;box-shadow:0 2px 10px rgba(0,0,0,.055);transition:box-shadow .18s,border-color .18s,transform .1s;-webkit-tap-highlight-color:transparent;user-select:none}
.tile:hover{box-shadow:0 6px 22px rgba(0,0,0,.10);border-color:var(--border)}
.tile:active{transform:scale(.982)}
.tile-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.tile-icon-blue{background:var(--blue-lt)}.tile-icon-orange{background:var(--orange-lt)}.tile-icon-green{background:var(--green-lt)}
.tile-body{flex:1;min-width:0}
.tile-title{font-size:15px;font-weight:700;line-height:1.4;margin-bottom:6px}
.tile-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px}
.badge-class{background:var(--blue-lt);color:var(--blue)}.badge-hw{background:var(--orange-lt);color:var(--orange)}
.badge-ans{background:var(--green-lt);color:var(--green)}.badge-done{background:var(--green-lt);color:var(--green)}
.badge-new{background:var(--red-lt);color:var(--red)}
.tile-date{font-size:12px;color:var(--gray)}.tile-deadline{font-size:12px;font-weight:700;color:var(--red)}
.tile-arrow{font-size:22px;color:#c8d0da;flex-shrink:0;font-weight:300}
.tile-submitted{border-color:var(--green)!important;background:linear-gradient(to right,#fff,#f0fdf4)}
.tile-checked{border-color:var(--blue)!important;background:linear-gradient(to right,#fff,#f0f6ff)}
.empty{text-align:center;padding:28px 0;color:var(--gray);font-size:14px;background:var(--white);border-radius:16px}
.empty-icon{font-size:32px;margin-bottom:8px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.50);z-index:200;display:flex;align-items:flex-end;justify-content:center}
.sheet{background:var(--white);border-radius:22px 22px 0 0;width:100%;max-width:680px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:slideUp .22s ease}
@keyframes slideUp{from{transform:translateY(60px);opacity:.3}to{transform:translateY(0);opacity:1}}
.sheet-handle{width:40px;height:4px;background:var(--border);border-radius:2px;margin:12px auto 0;flex-shrink:0}
.sheet-head{padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0}
.sheet-title{font-size:16px;font-weight:900;line-height:1.4}
.sheet-sub{font-size:13px;color:var(--gray);margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sheet-body{padding:20px;overflow-y:auto;flex:1}
.sheet-iframe{width:100%;height:300px;border:none;border-radius:12px;background:var(--bg)}
.sheet-file-box{background:var(--bg);border-radius:14px;padding:28px 20px;text-align:center}
.sheet-file-icon{font-size:48px;margin-bottom:10px}
.sheet-file-hint{font-size:13px;color:var(--gray);margin-bottom:16px}
.btn-open{display:inline-block;padding:14px 28px;background:var(--navy);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;transition:background .15s}
.btn-open:hover{background:var(--navy2)}
.btn-close-sheet{display:block;width:100%;padding:14px;margin-top:12px;background:var(--bg);border:none;border-radius:12px;font-size:15px;font-weight:700;color:var(--gray);cursor:pointer;font-family:inherit}
.submit-divider{border:none;border-top:2px dashed var(--border);margin:20px 0}
.submit-section-title{font-size:14px;font-weight:900;color:var(--navy);margin-bottom:14px}
.submit-status-done{background:var(--green-lt);border:1.5px solid var(--green);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px}
.submit-status-done-icon{font-size:24px;flex-shrink:0}
.submit-status-done-text{font-size:13px;line-height:1.5}
.submit-status-done-text strong{color:var(--green);display:block;font-size:14px;margin-bottom:2px}
.upload-area{border:2.5px dashed var(--border);border-radius:14px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color .18s,background .18s;background:var(--bg);position:relative}
.upload-area:hover,.upload-area.drag{border-color:var(--blue);background:var(--blue-lt)}
.upload-area input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.upload-area-icon{font-size:36px;margin-bottom:8px}
.upload-area-text{font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px}
.upload-area-hint{font-size:12px;color:var(--gray)}
.preview-box{margin-top:14px}
.preview-img{width:100%;max-height:240px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:#f8f8f8}
.preview-remove{font-size:12px;color:var(--red);cursor:pointer;margin-top:6px;display:inline-block;font-weight:700}
.comment-input{width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--bg);outline:none;resize:vertical;min-height:72px;transition:border-color .18s;margin-top:14px}
.comment-input:focus{border-color:var(--blue);background:#fff}
.btn-submit-hw{width:100%;padding:15px;background:var(--purple);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:12px}
.btn-submit-hw:disabled{opacity:.5;cursor:not-allowed}
.sub-filter{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.sub-filter-btn{padding:6px 16px;border-radius:20px;border:1.5px solid var(--border);background:var(--white);font-size:13px;font-weight:700;color:var(--gray);cursor:pointer;font-family:inherit}
.sub-filter-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.sub-card{background:var(--white);border-radius:14px;padding:16px 18px;box-shadow:0 2px 10px rgba(0,0,0,.055);margin-bottom:12px;border:2px solid transparent}
.sub-card-checked{border-color:var(--green)!important;background:linear-gradient(to right,#fff,#f0fdf4)}
.btn-check-done{display:block;width:100%;margin-top:12px;padding:13px;background:var(--navy);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.sub-card-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.sub-avatar{width:36px;height:36px;border-radius:50%;background:var(--navy);color:#e8c97a;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0}
.sub-card-name{font-size:14px;font-weight:900}
.sub-card-time{font-size:12px;color:var(--gray);margin-top:1px}
.sub-card-hw{font-size:13px;color:var(--gray);margin-bottom:6px}
.sub-card-comment{font-size:13px;color:var(--text);background:var(--bg);border-radius:8px;padding:8px 12px;line-height:1.5}
.sub-card-img{width:100%;max-height:180px;object-fit:contain;border-radius:10px;border:1px solid var(--border);margin-top:10px;background:#f8f8f8;cursor:pointer}
.center-overlay{position:fixed;inset:0;background:rgba(0,0,0,.50);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px}
.center-modal{background:var(--white);border-radius:18px;width:100%;max-width:540px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:fadeIn .18s ease}
@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.cmodal-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.cmodal-title{font-size:16px;font-weight:900;color:var(--navy)}
.cmodal-close{background:transparent;border:none;font-size:22px;color:var(--gray);cursor:pointer;line-height:1;padding:2px 6px}
.cmodal-body{padding:20px;overflow-y:auto;flex:1}
.cmodal-foot{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%);padding:20px}
.login-card{background:var(--white);border-radius:22px;padding:36px 28px;width:100%;max-width:420px;box-shadow:0 24px 80px rgba(0,0,0,.28)}
.login-logo{text-align:center;margin-bottom:28px}
.login-logo-icon{font-size:48px;margin-bottom:8px}
.login-logo-name{font-size:22px;font-weight:900;color:var(--navy)}
.login-logo-sub{font-size:11px;color:var(--gray);letter-spacing:2px;margin-top:3px}
.login-tabs{display:flex;border-bottom:2px solid var(--border);margin-bottom:24px}
.login-tab{flex:1;padding:11px;text-align:center;cursor:pointer;font-size:15px;font-weight:700;color:var(--gray);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .18s}
.login-tab.active{color:var(--navy);border-bottom-color:var(--blue)}
.field{margin-bottom:16px}
.field label{display:block;font-size:12px;font-weight:700;color:var(--gray);margin-bottom:6px;letter-spacing:.8px}
.field input,.field select{width:100%;padding:14px 15px;border:1.5px solid var(--border);border-radius:11px;font-size:15px;font-family:inherit;background:var(--bg);outline:none;transition:border-color .18s}
.field input:focus,.field select:focus{border-color:var(--blue);background:#fff}
.btn-login{width:100%;padding:16px;background:var(--navy);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;margin-top:6px}
.btn-login:hover{background:var(--navy2)}
.login-err{color:var(--red);font-size:13px;text-align:center;margin-top:10px;font-weight:700}
.login-hint{font-size:12px;color:#aab;text-align:center;margin-top:10px;line-height:1.6}
.t-tabs{display:flex;background:var(--white);border-radius:14px;padding:6px;margin-bottom:22px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.t-tab{flex:1;padding:11px 4px;text-align:center;font-size:13px;font-weight:700;color:var(--gray);border-radius:10px;cursor:pointer;transition:all .18s;white-space:nowrap;position:relative}
.t-tab.active{background:var(--navy);color:#fff}
.t-tab-badge{position:absolute;top:6px;right:6px;min-width:18px;height:18px;background:var(--red);color:#fff;border-radius:9px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 4px}
.stat-row{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:22px}
.stat-card{background:var(--white);border-radius:14px;padding:18px 16px;box-shadow:0 2px 10px rgba(0,0,0,.055);border-top:4px solid var(--blue)}
.stat-num{font-size:32px;font-weight:900;color:var(--navy)}.stat-lbl{font-size:12px;color:var(--gray);margin-top:3px}
.t-table{background:var(--white);border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.055);margin-bottom:20px}
.t-table table{width:100%;border-collapse:collapse}
.t-table th{background:var(--bg);padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--gray);letter-spacing:.5px}
.t-table td{padding:12px 14px;font-size:13px;border-top:1px solid var(--border);vertical-align:middle}
.t-table tr:hover td{background:#fafcff}
.form-card{background:var(--white);border-radius:14px;padding:22px 20px;box-shadow:0 2px 10px rgba(0,0,0,.055)}
.form-card h2{font-size:16px;font-weight:900;margin-bottom:18px;color:var(--navy)}
.form-row{margin-bottom:14px}
.form-row label{display:block;font-size:12px;font-weight:700;color:var(--gray);margin-bottom:5px;letter-spacing:.5px}
.form-row input,.form-row select{width:100%;padding:12px 13px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--bg);outline:none;transition:border-color .18s}
.form-row input:focus,.form-row select:focus{border-color:var(--blue);background:#fff}
.chk-group{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.chk-label{display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer;padding:9px 14px;background:var(--bg);border-radius:10px;border:1.5px solid var(--border);transition:all .15s;user-select:none}
.chk-label input{width:16px;height:16px;cursor:pointer;accent-color:var(--blue)}
.chk-label.checked{background:var(--blue-lt);border-color:var(--blue);font-weight:700}
.btn-submit{padding:13px 28px;background:var(--navy);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
.btn-del{padding:5px 12px;background:transparent;color:var(--red);border:1px solid var(--red);border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit}
.btn-del:hover{background:var(--red);color:#fff}
.btn-edit{padding:5px 12px;background:transparent;color:var(--blue);border:1px solid var(--blue);border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:6px}
.btn-edit:hover{background:var(--blue);color:#fff}
.btn-save{padding:11px 24px;background:var(--navy);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.btn-cancel{padding:11px 20px;background:var(--bg);color:var(--gray);border:1px solid var(--border);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.ok-msg{display:inline-block;color:var(--green);font-weight:700;font-size:13px;margin-left:12px;vertical-align:middle}
.del-overlay{position:fixed;inset:0;background:rgba(0,0,0,.48);z-index:400;display:flex;align-items:center;justify-content:center;padding:24px}
.del-modal{background:var(--white);border-radius:16px;padding:28px 24px;width:100%;max-width:360px;text-align:center;animation:fadeIn .15s ease}
.del-icon-big{font-size:40px;margin-bottom:12px}.del-title{font-size:16px;font-weight:900;margin-bottom:6px}
.del-sub{font-size:13px;color:var(--gray);margin-bottom:22px;line-height:1.5}
.del-btns{display:flex;gap:10px}
.del-btns .btn-cancel{flex:1}
.btn-del-confirm{flex:1;padding:11px;background:var(--red);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.loading{min-height:100vh;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--gray)}
@media(max-width:520px){
  .topbar{padding:0 12px}.topbar-user{max-width:90px}
  .page{padding:14px 10px 60px}
  .hero{padding:18px 16px 16px;border-radius:14px}.hero-name{font-size:17px}
  .tile{padding:14px 12px;gap:10px}.tile-icon{width:48px;height:48px;font-size:22px;border-radius:11px}.tile-title{font-size:14px}
  .sec-label{font-size:16px}.stat-row{gap:10px}.stat-num{font-size:26px}
  .t-tab{font-size:11px;padding:10px 2px}.t-table th,.t-table td{padding:9px 10px;font-size:12px}
  .form-card{padding:16px 14px}.login-card{padding:28px 20px}
  .cmodal-foot{flex-direction:column-reverse}.btn-save,.btn-cancel{width:100%;text-align:center}
}
`;

// ─────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────
function Loading() {
  return (
    <>
      <style>{CSS}</style>
      <div className="loading">🎓 読み込み中...</div>
    </>
  );
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [tab, setTab]     = useState("student");
  const [studentId, setStudentId] = useState("");
  const [pw, setPw]       = useState("");
  const [email, setEmail] = useState("");
  const [tpw, setTpw]     = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  async function loginStudent() {
    if (!studentId.trim() || !pw) { setErr("IDとパスワードを入力してください"); return; }
    setErr(""); setLoading(true);
    try {
      // FirestoreでIDからメールアドレスを検索
      const snap = await getDocs(collection(db, "students"));
      const found = snap.docs.find(d => d.data().studentId === studentId.trim());
      if (!found) {
        setErr("IDまたはパスワードが正しくありません");
        setLoading(false); return;
      }
      const email = found.data().email;
      await signInWithEmailAndPassword(auth, email, pw);
    } catch {
      setErr("IDまたはパスワードが正しくありません");
    }
    setLoading(false);
  }

  async function loginTeacher() {
    if (!email.trim() || !tpw) { setErr("メールアドレスとパスワードを入力してください"); return; }
    setErr(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), tpw);
    } catch {
      setErr("メールアドレスまたはパスワードが正しくありません");
    }
    setLoading(false);
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">🎓</div>
            <div className="login-logo-name">学習塾ポータル</div>
            <div className="login-logo-sub">LEARNING PORTAL</div>
          </div>
          <div className="login-tabs">
            <div className={`login-tab ${tab==="student"?"active":""}`} onClick={()=>{setTab("student");setErr("")}}>生徒</div>
            <div className={`login-tab ${tab==="teacher"?"active":""}`} onClick={()=>{setTab("teacher");setErr("")}}>講師</div>
          </div>
          {tab==="student" ? (<>
            <div className="field">
              <label>生徒ID</label>
              <input value={studentId} onChange={e=>setStudentId(e.target.value)}
                placeholder="塾から配布されたIDを入力"
                autoComplete="username"
                onKeyDown={e=>e.key==="Enter"&&loginStudent()} />
            </div>
            <div className="field">
              <label>パスワード</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                onKeyDown={e=>e.key==="Enter"&&loginStudent()} />
            </div>
            <div className="login-hint">IDとパスワードは塾からお渡しします</div>
            <button className="btn-login" onClick={loginStudent} disabled={loading}>
              {loading ? "ログイン中..." : "ログイン →"}
            </button>
          </>) : (<>
            <div className="field">
              <label>メールアドレス</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                onKeyDown={e=>e.key==="Enter"&&loginTeacher()} />
            </div>
            <div className="field">
              <label>パスワード</label>
              <input type="password" value={tpw} onChange={e=>setTpw(e.target.value)}
                placeholder="パスワードを入力"
                onKeyDown={e=>e.key==="Enter"&&loginTeacher()} />
            </div>
            <button className="btn-login" onClick={loginTeacher} disabled={loading}>
              {loading ? "ログイン中..." : "ログイン →"}
            </button>
          </>)}
          {err && <p className="login-err">⚠ {err}</p>}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// 宿題提出シート（生徒側）
// ─────────────────────────────────────────
function HwSheet({ m, mySubmission, studentInfo, onClose, onSubmit }) {
  const [img, setImg]         = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const fileRef               = useRef();

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setImg(e.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!img) { alert("画像を選んでください"); return; }
    setSending(true);
    try {
      // 1. Storage に画像をアップロード
      const subId   = `sub_${Date.now()}`;
      const imgRef  = ref(storage, `submissions/${subId}/image.jpg`);
      const blob    = await fetch(img).then(r => r.blob());
      await uploadBytes(imgRef, blob);
      const imageUrl = await getDownloadURL(imgRef);

      // 2. Firestore に提出データを保存
      await setDoc(doc(db, "submissions", subId), {
        hwId:        m.id,
        hwTitle:     m.title,
        studentId:   studentInfo.studentId,
        studentName: studentInfo.name,
        imagePath:   `submissions/${subId}/image.jpg`,
        imageUrl,
        comment,
        submittedAt: serverTimestamp(),
        status:      "submitted",
      });

      onSubmit();
      setDone(true);
    } catch (e) {
      alert("送信に失敗しました: " + e.message);
    }
    setSending(false);
  }

  const submitted = mySubmission || done;
  const checked   = mySubmission?.status === "checked";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="sheet-title">{m.icon} {m.title}</div>
          <div className="sheet-sub">
            <span className="badge badge-hw">{m.sub}</span>
            <span>配信日：{m.date}</span>
            {m.deadline && <span style={{color:"var(--red)",fontWeight:700}}>⚠ 期限：{m.deadline}</span>}
          </div>
        </div>
        <div className="sheet-body">
          <div className="sheet-file-box" style={{paddingBottom:20}}>
            <div className="sheet-file-icon">{m.icon}</div>
            <div className="sheet-file-hint">宿題プリントを確認する</div>
            <a href={m.url} target="_blank" rel="noreferrer" className="btn-open" style={{fontSize:14,padding:"12px 24px"}}>📂 プリントを開く</a>
          </div>
          <hr className="submit-divider" />
          <div className="submit-section-title">📬 宿題を提出する</div>
          {submitted ? (
            <>
              {checked && (
                <div style={{background:"var(--green-lt)",border:"1.5px solid var(--green)",borderRadius:12,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"flex-start",gap:12}}>
                  <span style={{fontSize:24}}>👀</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:900,color:"var(--green)",marginBottom:3}}>先生が確認しました！</div>
                    {mySubmission?.checkedAt && <div style={{fontSize:12,color:"var(--gray)"}}>確認日時：{mySubmission.checkedAt?.toDate?.()?.toLocaleString("ja-JP") || ""}</div>}
                  </div>
                </div>
              )}
              <div className="submit-status-done">
                <div className="submit-status-done-icon">✅</div>
                <div className="submit-status-done-text">
                  <strong>提出済みです</strong>
                  {mySubmission?.comment && <span>コメント：{mySubmission.comment}</span>}
                  {!checked && <span style={{color:"var(--gray)",fontSize:12,marginTop:4,display:"block"}}>先生の確認をお待ちください…</span>}
                </div>
              </div>
              {mySubmission?.imageUrl && <img src={mySubmission.imageUrl} alt="提出済み画像" className="preview-img" />}
            </>
          ) : (
            <>
              <div className="upload-area"
                onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("drag")}}
                onDragLeave={e=>e.currentTarget.classList.remove("drag")}
                onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("drag");handleFile(e.dataTransfer.files[0])}}>
                <input type="file" accept="image/*" ref={fileRef} onChange={e=>handleFile(e.target.files[0])} />
                <div className="upload-area-icon">📸</div>
                <div className="upload-area-text">画像をタップして選ぶ</div>
                <div className="upload-area-hint">またはここにドロップ（JPG・PNG・HEIC）</div>
              </div>
              {img && (
                <div className="preview-box">
                  <img src={img} alt="プレビュー" className="preview-img" />
                  <span className="preview-remove" onClick={()=>setImg(null)}>✕ 削除して選び直す</span>
                </div>
              )}
              <textarea className="comment-input" placeholder="先生へのコメント（任意）"
                value={comment} onChange={e=>setComment(e.target.value)} />
              <button className="btn-submit-hw" onClick={handleSubmit} disabled={!img||sending}>
                {sending ? "送信中…" : "📬 提出する"}
              </button>
            </>
          )}
          <button className="btn-close-sheet" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// コンテンツシート（生徒側）
// ─────────────────────────────────────────
function ContentSheet({ m, onClose }) {
  const isVideo = m.sub === "動画";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="sheet-title">{m.icon} {m.title}</div>
          <div className="sheet-sub">
            <span className={`badge ${m.type==="class"?"badge-class":"badge-ans"}`}>{m.sub}</span>
            <span>配信日：{m.date}</span>
          </div>
        </div>
        <div className="sheet-body">
          {isVideo
            ? <iframe className="sheet-iframe" src={m.url} title={m.title} allowFullScreen />
            : <div className="sheet-file-box">
                <div className="sheet-file-icon">{m.icon}</div>
                <div className="sheet-file-hint">タップしてファイルを開く</div>
                <a href={m.url} target="_blank" rel="noreferrer" className="btn-open">📂 ファイルを開く</a>
              </div>
          }
          <button className="btn-close-sheet" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STUDENT APP
// ─────────────────────────────────────────
function StudentApp({ firebaseUser, studentInfo, onLogout }) {
  const [materials,    setMaterials]    = useState([]);
  const [submissions,  setSubmissions]  = useState([]);
  const [sel,          setSel]          = useState(null);

  // Firestore リアルタイム購読
  useEffect(() => {
    const qMat = query(collection(db, "materials"), orderBy("date", "desc"));
    const unsubMat = onSnapshot(qMat, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaterials(all.filter(m => (m.targets || []).includes(studentInfo.studentId)));
    });
    const qSub = query(collection(db, "submissions"));
    const unsubSub = onSnapshot(qSub, snap => {
      setSubmissions(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.studentId === studentInfo.studentId));
    });
    return () => { unsubMat(); unsubSub(); };
  }, [studentInfo.studentId]);

  const classItems = materials.filter(m => m.type === "class");
  const hwItems    = materials.filter(m => m.type === "hw" || m.type === "answer");

  function getMySubmission(hwId) {
    return submissions.find(s => s.hwId === hwId);
  }

  function Tile({ m }) {
    const isHw      = m.type === "hw";
    const mySub     = isHw && getMySubmission(m.id);
    const submitted = !!mySub;
    const checked   = mySub?.status === "checked";
    const iconCls   = m.type==="class" ? "tile-icon-blue" : m.type==="hw" ? "tile-icon-orange" : "tile-icon-green";
    const bdgCls    = m.type==="class" ? "badge-class" : m.type==="hw" ? "badge-hw" : "badge-ans";
    return (
      <div className={`tile ${checked?"tile-checked":submitted?"tile-submitted":""}`} onClick={()=>setSel(m)}>
        <div className={`tile-icon ${iconCls}`}>{m.icon}</div>
        <div className="tile-body">
          <div className="tile-title">{m.title}</div>
          <div className="tile-meta">
            <span className={`badge ${bdgCls}`}>{m.sub}</span>
            {checked   && <span className="badge badge-done">👀 確認済み</span>}
            {submitted && !checked && <span className="badge" style={{background:"var(--purple-lt)",color:"var(--purple)"}}>✅ 提出済</span>}
            <span className="tile-date">{m.date}</span>
            {m.deadline && <span className="tile-deadline">⚠ 期限 {m.deadline}</span>}
          </div>
        </div>
        <div className="tile-arrow">›</div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">🎓</span>
          <span className="topbar-name">学習塾ポータル</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{studentInfo.name}（{studentInfo.grade}）</span>
          <button className="btn-top" onClick={onLogout}>ログアウト</button>
        </div>
      </div>
      <div className="page">
        <div className="hero">
          <div className="hero-name">こんにちは、{studentInfo.name} さん 👋</div>
          <div className="hero-grade">{studentInfo.grade}</div>
          <div className="hero-date">{TODAY}</div>
        </div>
        <div className="section">
          <div className="sec-head">
            <div className="sec-bar sec-bar-blue" />
            <span className="sec-label">📖 今日の授業</span>
            <span className="sec-count">{classItems.length}件</span>
          </div>
          <div className="tiles">
            {classItems.length === 0
              ? <div className="empty"><div className="empty-icon">📭</div>授業資料はありません</div>
              : classItems.map(m => <Tile key={m.id} m={m} />)}
          </div>
        </div>
        <div className="section">
          <div className="sec-head">
            <div className="sec-bar sec-bar-orange" />
            <span className="sec-label">✏️ 宿題・解答</span>
            <span className="sec-count">{hwItems.length}件</span>
          </div>
          <div className="tiles">
            {hwItems.length === 0
              ? <div className="empty"><div className="empty-icon">🎉</div>現在の宿題はありません</div>
              : hwItems.map(m => <Tile key={m.id} m={m} />)}
          </div>
        </div>
      </div>
      {sel && sel.type === "hw" && (
        <HwSheet m={sel} mySubmission={getMySubmission(sel.id)} studentInfo={studentInfo}
          onClose={()=>setSel(null)} onSubmit={()=>setSel(null)} />
      )}
      {sel && sel.type !== "hw" && <ContentSheet m={sel} onClose={()=>setSel(null)} />}
    </>
  );
}

// ─────────────────────────────────────────
// STUDENTS PANEL（講師用）
// ─────────────────────────────────────────
function StudentsPanel({ students }) {
  const GRADES = ["小学1年","小学2年","小学3年","小学4年","小学5年","小学6年",
                  "中学1年","中学2年","中学3年","高校1年","高校2年","高校3年","その他"];
  const BLANK = { name:"", grade:"中学1年", studentId:"", email:"", password:"" };
  const [form, setForm]       = useState(BLANK);
  const [adding, setAdding]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  function genId() {
    const num = String(students.length + 1).padStart(3, "0");
    setForm(f => ({ ...f, studentId: "s" + num }));
  }

  function genPw() {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const pw = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm(f => ({ ...f, password: pw }));
    setShowPw(true);
  }

  async function handleAdd() {
    if (!form.name || !form.studentId || !form.email || !form.password) {
      setMsg("⚠ すべての項目を入力してください"); return;
    }
    if (students.find(s => s.studentId === form.studentId)) {
      setMsg("⚠ そのIDはすでに使われています"); return;
    }
    setLoading(true); setMsg("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid  = cred.user.uid;
      await setDoc(doc(db, "students", form.studentId), {
        name: form.name, grade: form.grade,
        studentId: form.studentId, email: form.email, uid,
        createdAt: serverTimestamp(),
      });
      setMsg("✅ 生徒を追加しました！");
      setForm(BLANK); setAdding(false); setShowPw(false);
    } catch(e) {
      setMsg("⚠ エラー：" + e.message);
    }
    setLoading(false);
  }

  const [pwTarget, setPwTarget] = useState(null); // パスワード変更対象
  const [newPw, setNewPw]       = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg]       = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePw() {
    if (!newPw || newPw.length < 6) { setPwMsg("⚠ 6文字以上で入力してください"); return; }
    setPwLoading(true); setPwMsg("");
    try {
      // Firebase Admin SDKがないためCloud Functions経由が理想だが、
      // 現状はFirebase Consoleから変更するよう案内する
      // ここでは視覚的なUXのみ提供し、実際の変更はConsoleで行う
      setPwMsg("✅ Firebase Console → Authentication でパスワードを変更してください。\n新しいパスワード：" + newPw);
    } catch(e) {
      setPwMsg("⚠ エラー：" + e.message);
    }
    setPwLoading(false);
  }

  function genNewPw() {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const pw = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setNewPw(pw);
    setShowNewPw(true);
  }

  async function handleDelete() {
    await deleteDoc(doc(db, "students", delTarget.studentId));
    setDelTarget(null);
  }

  return (
    <>
      {/* 追加ボタン */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <button className="btn-submit" style={{margin:0,fontSize:13,padding:"10px 20px"}}
          onClick={()=>{setAdding(!adding);setMsg("")}}>
          {adding ? "✕ キャンセル" : "＋ 生徒を追加"}
        </button>
      </div>

      {/* 追加フォーム */}
      {adding && (
        <div className="form-card" style={{marginBottom:16}}>
          <h2>＋ 新しい生徒を追加</h2>
          <div className="form-row">
            <label>名前</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="例：田中 花子" />
          </div>
          <div className="form-row">
            <label>学年</label>
            <select value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>生徒ID（ログインには使いません・管理用）</label>
            <div style={{display:"flex",gap:8}}>
              <input value={form.studentId} onChange={e=>setForm(f=>({...f,studentId:e.target.value}))} placeholder="例：s004" style={{flex:1}} />
              <button type="button" className="btn-cancel" style={{padding:"10px 14px",fontSize:13,whiteSpace:"nowrap"}} onClick={genId}>自動生成</button>
            </div>
          </div>
          <div className="form-row">
            <label>メールアドレス（ログインに使用）</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="例：hanako@example.com" />
          </div>
          <div className="form-row">
            <label>パスワード</label>
            <div style={{display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1}}>
                <input
                  type={showPw?"text":"password"}
                  value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  placeholder="パスワードを設定"
                  style={{width:"100%"}}
                />
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15}}>
                  {showPw?"🙈":"👁"}
                </button>
              </div>
              <button type="button" className="btn-cancel" style={{padding:"10px 14px",fontSize:13,whiteSpace:"nowrap"}} onClick={genPw}>自動生成</button>
            </div>
            {form.password && (
              <div style={{marginTop:6,padding:"8px 12px",background:"var(--orange-lt)",borderRadius:8,fontSize:12,color:"var(--orange)",fontWeight:700}}>
                ⚠ このパスワードをメモして生徒に渡してください
              </div>
            )}
          </div>
          <button className="btn-submit" onClick={handleAdd} disabled={loading}>
            {loading ? "追加中..." : "✅ 追加する"}
          </button>
          {msg && <div style={{marginTop:10,fontSize:13,fontWeight:700,color:msg.startsWith("✅")?"var(--green)":"var(--red)"}}>{msg}</div>}
        </div>
      )}

      {/* 一覧 */}
      <div className="t-table">
        <table>
          <thead><tr><th>名前</th><th>学年</th><th>メールアドレス</th><th>生徒ID</th><th></th></tr></thead>
          <tbody>
            {students.length===0 && (
              <tr><td colSpan={5} style={{textAlign:"center",padding:"28px",color:"var(--gray)"}}>生徒が登録されていません</td></tr>
            )}
            {students.map(s=>(
              <tr key={s.id}>
                <td style={{fontWeight:700}}>{s.name}</td>
                <td>{s.grade}</td>
                <td style={{fontSize:12,color:"var(--gray)"}}>{s.email}</td>
                <td style={{fontFamily:"monospace",fontSize:12,color:"var(--gray)"}}>{s.studentId}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn-edit" onClick={()=>{setPwTarget(s);setNewPw("");setPwMsg("");setShowNewPw(false);}}>PW変更</button>
                  <button className="btn-del" onClick={()=>setDelTarget(s)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* パスワード変更モーダル */}
      {pwTarget && (
        <div className="center-overlay" onClick={()=>setPwTarget(null)}>
          <div className="center-modal" onClick={e=>e.stopPropagation()}>
            <div className="cmodal-head">
              <span className="cmodal-title">🔑 {pwTarget.name} のパスワード変更</span>
              <button className="cmodal-close" onClick={()=>setPwTarget(null)}>×</button>
            </div>
            <div className="cmodal-body">
              <div style={{fontSize:13,color:"var(--gray)",marginBottom:14}}>
                メールアドレス：{pwTarget.email}
              </div>
              <div className="form-row">
                <label>新しいパスワード</label>
                <div style={{display:"flex",gap:8}}>
                  <div style={{position:"relative",flex:1}}>
                    <input
                      type={showNewPw?"text":"password"}
                      value={newPw}
                      onChange={e=>setNewPw(e.target.value)}
                      placeholder="6文字以上"
                      style={{width:"100%"}}
                    />
                    <button type="button" onClick={()=>setShowNewPw(v=>!v)}
                      style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15}}>
                      {showNewPw?"🙈":"👁"}
                    </button>
                  </div>
                  <button type="button" className="btn-cancel" style={{padding:"10px 14px",fontSize:13,whiteSpace:"nowrap"}} onClick={genNewPw}>自動生成</button>
                </div>
              </div>
              {newPw && (
                <div style={{padding:"8px 12px",background:"var(--orange-lt)",borderRadius:8,fontSize:12,color:"var(--orange)",fontWeight:700,marginTop:8}}>
                  ⚠ このパスワードをメモして生徒に渡してください
                </div>
              )}
              <div style={{marginTop:14,padding:"12px 14px",background:"var(--blue-lt)",borderRadius:10,fontSize:12,color:"var(--blue)",lineHeight:1.6}}>
                📋 変更手順：<br/>
                1. 上で新しいパスワードを生成・メモする<br/>
                2. <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{color:"var(--blue)",fontWeight:700}}>Firebase Console</a> → Authentication を開く<br/>
                3. {pwTarget.email} を検索してパスワードをリセット
              </div>
              {pwMsg && (
                <div style={{marginTop:10,padding:"10px 14px",background:"var(--green-lt)",borderRadius:8,fontSize:13,fontWeight:700,color:"var(--green)",whiteSpace:"pre-line"}}>
                  {pwMsg}
                </div>
              )}
            </div>
            <div className="cmodal-foot">
              <button className="btn-cancel" onClick={()=>setPwTarget(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {delTarget && (
        <div className="del-overlay" onClick={()=>setDelTarget(null)}>
          <div className="del-modal" onClick={e=>e.stopPropagation()}>
            <div className="del-icon-big">👤</div>
            <div className="del-title">{delTarget.name} を削除しますか？</div>
            <div className="del-sub">Firestoreのデータが削除されます。<br/>ログインはできなくなります。</div>
            <div className="del-btns">
              <button className="btn-cancel" onClick={()=>setDelTarget(null)}>キャンセル</button>
              <button className="btn-del-confirm" onClick={handleDelete}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────
// TEACHER APP
// ─────────────────────────────────────────
function TeacherApp({ onLogout }) {
  const [tab,         setTab]         = useState("home");
  const [students,    setStudentsState] = useState([]);
  const [materials,   setMaterials]   = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form,        setForm]        = useState({ title:"", sub:"PDF", url:"", deadline:"", targets:[] });
  const [done,        setDone]        = useState(false);

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, "students"),  snap => setStudentsState(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubM = onSnapshot(query(collection(db,"materials"),orderBy("date","desc")), snap => setMaterials(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubSub = onSnapshot(query(collection(db,"submissions"),orderBy("submittedAt","desc")), snap => setSubmissions(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { unsubS(); unsubM(); unsubSub(); };
  }, []);

  // ── 教材配信 ──
  async function handleUpload() {
    if (!form.title || !form.url || form.targets.length===0) { alert("タイトル・URL・対象生徒を入力してください"); return; }
    const icon = SUB_TO_ICON[form.sub] || "📄";
    const type = SUB_TO_TYPE[form.sub] || "class";
    await addDoc(collection(db, "materials"), {
      title: form.title, sub: form.sub, type, icon, url: form.url,
      date: new Date().toISOString().slice(0,10),
      targets: form.targets,
      ...(form.deadline ? {deadline: form.deadline} : {}),
      createdAt: serverTimestamp(),
    });
    setDone(true); setTimeout(()=>setDone(false),2500);
    setForm({title:"",sub:"PDF",url:"",deadline:"",targets:[]});
  }

  // ── 教材削除 ──
  async function deleteMaterial(id) {
    if (!window.confirm("この教材を削除しますか？")) return;
    await deleteDoc(doc(db,"materials",id));
  }

  // ── 提出物を確認済みに ──
  async function markChecked(subId) {
    await updateDoc(doc(db,"submissions",subId), {
      status: "checked",
      checkedAt: serverTimestamp(),
    });
  }

  // ── 生徒追加 ──
  async function addStudent(s) {
    try {
      // Firebase Auth にアカウント作成
      // ※ Admin SDK が使えないため createUserWithEmailAndPassword を使用
      //   実運用では Cloud Functions で処理するのが望ましい
      const cred = await createUserWithEmailAndPassword(auth, s.email, s.password);
      const uid  = cred.user.uid;
      // 元の講師アカウントに戻す（生徒アカウントで上書きされないよう即logout→loginは不要、uidだけ使う）
      await setDoc(doc(db, "students", s.studentId), {
        name: s.name, grade: s.grade, studentId: s.studentId, uid,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch(e) {
      alert("生徒追加エラー: " + e.message);
      return false;
    }
  }

  const uncheckedCount = submissions.filter(s=>s.status!=="checked").length;

  const TABS = [
    {id:"home",label:"🏠 ホーム"},
    {id:"upload",label:"📤 配信"},
    {id:"list",label:"📋 一覧"},
    {id:"submissions",label:"📬 提出物",badge:uncheckedCount},
    {id:"students",label:"👥 生徒"},
  ];

  function toggleTarget(id) {
    setForm(f=>({...f,targets:f.targets.includes(id)?f.targets.filter(x=>x!==id):[...f.targets,id]}));
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-left"><span className="topbar-logo">🎓</span><span className="topbar-name">学習塾ポータル</span></div>
        <div className="topbar-right"><span className="topbar-user">講師モード</span><button className="btn-top" onClick={onLogout}>ログアウト</button></div>
      </div>
      <div className="page">
        <div className="t-tabs">
          {TABS.map(t=>(
            <div key={t.id} className={`t-tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
              {t.label}
              {t.badge>0 && <span className="t-tab-badge">{t.badge}</span>}
            </div>
          ))}
        </div>

        {/* HOME */}
        {tab==="home" && <>
          <div className="stat-row">
            <div className="stat-card"><div className="stat-num">{students.length}</div><div className="stat-lbl">登録生徒</div></div>
            <div className="stat-card"><div className="stat-num">{materials.length}</div><div className="stat-lbl">教材総数</div></div>
            <div className="stat-card"><div className="stat-num">{materials.filter(m=>m.type==="hw").length}</div><div className="stat-lbl">宿題数</div></div>
            <div className="stat-card"><div className="stat-num">{submissions.length}</div><div className="stat-lbl">提出数</div></div>
          </div>
          <div className="t-table">
            <table>
              <thead><tr><th>タイトル</th><th>種別</th><th>対象</th></tr></thead>
              <tbody>
                {materials.slice(0,6).map(m=>(
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.icon} {m.title}</td>
                    <td><span className={`badge ${m.type==="class"?"badge-class":m.type==="hw"?"badge-hw":"badge-ans"}`}>{m.sub}</span></td>
                    <td style={{color:"var(--gray)"}}>{m.targets?.length}名</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* UPLOAD */}
        {tab==="upload" && (
          <div className="form-card">
            <h2>📤 新しい教材を配信する</h2>
            <div className="form-row"><label>タイトル</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="例：数学 二次方程式 解説" /></div>
            <div className="form-row"><label>種別</label>
              <select value={form.sub} onChange={e=>setForm(f=>({...f,sub:e.target.value}))}>
                <option>PDF</option><option>スライド</option><option>動画</option><option>宿題</option><option>解答</option>
              </select>
            </div>
            <div className="form-row"><label>URL（Google Drive / YouTube 等）</label><input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." /></div>
            {form.sub==="宿題" && <div className="form-row"><label>提出期限</label><input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></div>}
            <div className="form-row">
              <label>対象生徒</label>
              <div className="chk-group">
                {students.map(s=>(
                  <label key={s.id} className={`chk-label ${form.targets.includes(s.studentId)?"checked":""}`}>
                    <input type="checkbox" checked={form.targets.includes(s.studentId)} onChange={()=>toggleTarget(s.studentId)}/>{s.name}
                  </label>
                ))}
                <label className={`chk-label ${form.targets.length===students.length&&students.length>0?"checked":""}`}>
                  <input type="checkbox" checked={form.targets.length===students.length&&students.length>0}
                    onChange={()=>setForm(f=>({...f,targets:f.targets.length===students.length?[]:students.map(s=>s.studentId)}))}/>全員
                </label>
              </div>
            </div>
            <button className="btn-submit" onClick={handleUpload}>📤 配信する</button>
            {done && <span className="ok-msg">✅ 配信しました！</span>}
          </div>
        )}

        {/* LIST */}
        {tab==="list" && (
          <div className="t-table">
            <table>
              <thead><tr><th>タイトル</th><th>種別</th><th>対象</th><th></th></tr></thead>
              <tbody>
                {materials.map(m=>(
                  <tr key={m.id}>
                    <td style={{fontWeight:600}}>{m.icon} {m.title}</td>
                    <td><span className={`badge ${m.type==="class"?"badge-class":m.type==="hw"?"badge-hw":"badge-ans"}`}>{m.sub}</span></td>
                    <td style={{color:"var(--gray)",fontSize:12}}>{m.targets?.map(id=>students.find(s=>s.studentId===id)?.name).filter(Boolean).join("・")}</td>
                    <td><button className="btn-del" onClick={()=>deleteMaterial(m.id)}>削除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBMISSIONS */}
        {tab==="submissions" && (
          <>
            {uncheckedCount > 0 && (
              <div style={{background:"var(--red-lt)",border:"1.5px solid var(--red)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:700,color:"var(--red)"}}>
                <span style={{fontSize:18}}>📬</span>未確認の提出物が {uncheckedCount} 件あります
              </div>
            )}
            {submissions.length===0 && <div className="empty"><div className="empty-icon">📭</div>提出物はまだありません</div>}
            {submissions.map(sub=>{
              const isChecked = sub.status==="checked";
              return (
                <div key={sub.id} className={`sub-card ${isChecked?"sub-card-checked":""}`}>
                  <div className="sub-card-head">
                    <div className="sub-avatar">{sub.studentName?.[0]}</div>
                    <div style={{flex:1}}>
                      <div className="sub-card-name">{sub.studentName}</div>
                      <div className="sub-card-time">提出：{sub.submittedAt?.toDate?.()?.toLocaleString("ja-JP") || sub.submittedAt}</div>
                      {isChecked && <div className="sub-card-time" style={{color:"var(--green)",fontWeight:700}}>✅ 確認済</div>}
                    </div>
                    <span className={`badge ${isChecked?"badge-done":"badge-new"}`}>{isChecked?"確認済":"未確認"}</span>
                  </div>
                  <div className="sub-card-hw">📝 {sub.hwTitle}</div>
                  {sub.comment && <div className="sub-card-comment">💬 {sub.comment}</div>}
                  {sub.imageUrl && <img src={sub.imageUrl} alt="提出画像" className="sub-card-img" />}
                  {!isChecked && <button className="btn-check-done" onClick={()=>markChecked(sub.id)}>👀 確認済みにする</button>}
                </div>
              );
            })}
          </>
        )}

        {/* STUDENTS */}
        {tab==="students" && (
          <StudentsPanel students={students} />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = useState("loading"); // "loading"|"login"|"student"|"teacher"
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [studentInfo,  setStudentInfo]  = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setAuthState("login"); return; }
      setFirebaseUser(fbUser);

      // 講師判定
      const teacher = await isTeacherUid(fbUser.uid);
      if (teacher) { setAuthState("teacher"); return; }

      // 生徒判定（uid で Firestore students を検索）
      const snap = await getDocs(collection(db, "students"));
      const found = snap.docs.find(d => d.data().uid === fbUser.uid);
      if (found) {
        setStudentInfo({ id: found.id, ...found.data() });
        setAuthState("student");
      } else {
        // 登録のない uid → ログアウト
        await signOut(auth);
        setAuthState("login");
      }
    });
    return unsub;
  }, []);

  async function handleLogout() {
    await signOut(auth);
    setAuthState("login");
    setFirebaseUser(null);
    setStudentInfo(null);
  }

  if (authState === "loading")  return <Loading />;
  if (authState === "login")    return <LoginPage />;
  if (authState === "teacher")  return <TeacherApp onLogout={handleLogout} />;
  if (authState === "student")  return <StudentApp firebaseUser={firebaseUser} studentInfo={studentInfo} onLogout={handleLogout} />;
  return <Loading />;
}
