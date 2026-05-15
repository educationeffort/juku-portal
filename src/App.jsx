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
const SUBJECTS = ["英語","数学","国語","理科","社会","その他"];
const SUBJECT_COLORS = { 英語:"#2e86de", 数学:"#e74c3c", 国語:"#8e44ad", 理科:"#27ae60", 社会:"#e67e22", その他:"#7f8c8d" };
const SUB_TO_TYPE = { PDF:"class", スライド:"class", 動画:"class", 宿題:"hw", 解答:"answer", 授業前テスト:"pretest" };
const SUB_TO_ICON = { PDF:"📄", スライド:"📊", 動画:"🎬", 宿題:"📝", 解答:"✅", 授業前テスト:"🎯" };

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
  --bg:#f0f4f8; --white:#fff;
  --navy:#004499; --navy2:#0066CC;
  --blue:#0066CC; --blue-lt:#ddeeff;
  --green:#00A651; --green-lt:#d4f5e2;
  --orange:#e67e22; --orange-lt:#fdebd0;
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
.sec-bar-blue{background:var(--blue)}.sec-bar-orange{background:var(--orange)}.sec-bar-green{background:var(--green)}.sec-bar-purple{background:var(--purple)}
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

/* 教科バッジ */
.subj-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:900;border:1.5px solid transparent}

/* 新生徒画面 */
.s-section{margin-bottom:24px}
.s-section-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:14px 16px;border-radius:14px;cursor:pointer;transition:opacity .15s}
.s-section-head:hover{opacity:.85}
.s-section-icon{font-size:24px;flex-shrink:0}
.s-section-title{font-size:17px;font-weight:900;color:#fff;flex:1}
.s-section-count{font-size:12px;font-weight:700;background:rgba(255,255,255,.25);color:#fff;padding:2px 10px;border-radius:12px}
.s-section-arrow{font-size:18px;color:rgba(255,255,255,.7);transition:transform .2s}
.s-section-arrow.open{transform:rotate(90deg)}

/* カード */
.s-card{background:#fff;border-radius:14px;padding:16px 18px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,.06);cursor:pointer;transition:all .18s;border:2px solid transparent;display:flex;align-items:center;gap:14px}
.s-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.10);border-color:var(--border)}
.s-card:active{transform:scale(.982)}
.s-card-icon{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.s-card-body{flex:1;min-width:0}
.s-card-title{font-size:15px;font-weight:700;line-height:1.4;margin-bottom:6px}
.s-card-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.s-card-arrow{font-size:20px;color:#c8d0da;flex-shrink:0}
.s-card.submitted{border-color:var(--green)!important;background:linear-gradient(to right,#fff,#f0fdf4)}
.s-card.checked{border-color:var(--blue)!important;background:linear-gradient(to right,#fff,#f0f6ff)}

/* テストカード */
.test-card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:10px}
.test-input-row{display:flex;gap:12px;margin-bottom:14px}
.test-input-box{flex:1;text-align:center}
.test-input-box label{display:block;font-size:12px;font-weight:700;color:var(--gray);margin-bottom:6px}
.test-input-box input{width:100%;padding:14px;border:2px solid var(--border);border-radius:12px;font-size:22px;font-weight:900;text-align:center;font-family:inherit;background:var(--bg);outline:none;transition:border-color .18s}
.test-input-box input:focus{border-color:var(--blue);background:#fff}
.test-score-preview{text-align:center;font-size:28px;font-weight:900;margin-bottom:12px;color:var(--blue)}
.test-submit-btn{width:100%;padding:15px;background:var(--blue);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;transition:background .15s}
.test-submit-btn:hover{background:#0055bb}
.test-submit-btn:disabled{opacity:.5;cursor:not-allowed}
.test-done-card{background:var(--green-lt);border:2px solid var(--green);border-radius:14px;padding:20px;display:flex;align-items:center;gap:16px}
.test-done-icon{font-size:36px;flex-shrink:0}
.test-done-title{font-size:15px;font-weight:900;color:var(--green);margin-bottom:4px}
.test-done-score{font-size:14px;color:var(--text)}

/* 週間予定 */
.week-wrap{display:flex;flex-direction:column;gap:8px}
.day-card{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,.055);display:flex;align-items:flex-start;gap:14px}
.day-card.today{border:2px solid var(--blue);background:var(--blue-lt)}
.day-label{flex-shrink:0;text-align:center;min-width:44px}
.day-name{font-size:12px;font-weight:900;color:var(--gray)}
.day-date{font-size:18px;font-weight:900;color:var(--navy)}
.day-card.today .day-name{color:var(--blue)}
.day-card.today .day-date{color:var(--blue)}
.day-content{flex:1;min-width:0}
.day-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}
.day-item:last-child{border-bottom:none}
.day-subject{font-size:12px;font-weight:900;padding:2px 8px;border-radius:10px;flex-shrink:0}
.day-text{font-size:14px;color:var(--text);line-height:1.4}
.day-empty{font-size:13px;color:var(--gray);font-style:italic}

/* ホワイトボード */
.wb-wrap{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:16px}
.wb-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)}
.wb-tool-btn{padding:6px 12px;border-radius:8px;border:1.5px solid var(--border);background:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
.wb-tool-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.wb-tool-btn:hover:not(.active){background:var(--bg)}
.wb-color-btn{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all .15s}
.wb-color-btn.active{border-color:var(--navy);transform:scale(1.2)}
.wb-canvas{width:100%;touch-action:none;cursor:crosshair;border-radius:12px;border:1.5px solid var(--border);display:block;background:#fafafa}
.wb-actions{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
.wb-student-select{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.wb-student-btn{padding:8px 16px;border-radius:10px;border:1.5px solid var(--border);background:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
.wb-student-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
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
// WHITEBOARD COMPONENT（boardIdベース・汎用）
// ─────────────────────────────────────────
function Whiteboard({ boardId, boardLabel, readOnly }) {
  const canvasRef   = useRef(null);
  const drawing     = useRef(false);
  const lastPos     = useRef(null);
  const ignoreNext  = useRef(false);
  const [tool, setTool]   = useState("pen");
  const [color, setColor] = useState("#1a2535");
  const [size, setSize]   = useState(3);
  const [saving, setSaving] = useState(false);
  const COLORS = ["#1a2535","#e74c3c","#2e86de","#27ae60","#e67e22","#8e44ad","#ffffff"];

  // Firestoreからリアルタイム同期
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "whiteboards", boardId), (snap) => {
      if (!snap.exists() || ignoreNext.current) { ignoreNext.current = false; return; }
      const data = snap.data();
      if (!data.imageData) {
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = data.imageData;
    });
    return unsub;
  }, [boardId]);

  // キャンバスサイズ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = Math.max(320, rect.width * 0.6);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left)*scaleX, y: (src.clientY - rect.top)*scaleY };
  }

  function startDraw(e) {
    if (readOnly) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  }

  function draw(e) {
    if (!drawing.current || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool==="eraser" ? "#fafafa" : color;
    ctx.lineWidth   = tool==="eraser" ? size*6 : size;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  async function endDraw(e) {
    if (!drawing.current || readOnly) return;
    e.preventDefault();
    drawing.current = false;
    lastPos.current = null;
    setSaving(true);
    try {
      ignoreNext.current = true;
      const imageData = canvasRef.current.toDataURL("image/png", 0.6);
      await setDoc(doc(db,"whiteboards",boardId), {
        imageData, updatedAt: serverTimestamp(), boardId, boardLabel: boardLabel||boardId,
      }, { merge: true });
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  async function handleClear() {
    if (!window.confirm("ホワイトボードを全消ししますか？")) return;
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    await setDoc(doc(db,"whiteboards",boardId), {
      imageData:"", updatedAt:serverTimestamp(), boardId, boardLabel:boardLabel||boardId,
    }, { merge: true });
  }

  return (
    <div className="wb-wrap">
      {!readOnly && (
        <div className="wb-toolbar">
          <button className={`wb-tool-btn ${tool==="pen"?"active":""}`} onClick={()=>setTool("pen")}>✏️ ペン</button>
          <button className={`wb-tool-btn ${tool==="eraser"?"active":""}`} onClick={()=>setTool("eraser")}>🧹 消しゴム</button>
          <div style={{width:1,height:24,background:"var(--border)",margin:"0 4px"}} />
          {COLORS.map(c=>(
            <div key={c} className={`wb-color-btn ${color===c&&tool==="pen"?"active":""}`}
              style={{background:c,border:c==="#ffffff"?"2px solid #ccc":undefined}}
              onClick={()=>{setColor(c);setTool("pen")}} />
          ))}
          <div style={{width:1,height:24,background:"var(--border)",margin:"0 4px"}} />
          <select value={size} onChange={e=>setSize(Number(e.target.value))}
            style={{padding:"4px 8px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:13,fontFamily:"inherit",background:"var(--bg)"}}>
            <option value={2}>細い</option><option value={4}>普通</option><option value={8}>太い</option>
          </select>
          {saving && <span style={{fontSize:12,color:"var(--gray)"}}>保存中...</span>}
        </div>
      )}
      <canvas ref={canvasRef} className="wb-canvas"
        style={{cursor:readOnly?"default":tool==="eraser"?"cell":"crosshair"}}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
      {!readOnly && (
        <div className="wb-actions">
          <button className="btn-del" onClick={handleClear}>🗑 全消し</button>
        </div>
      )}
      {readOnly && (
        <div style={{textAlign:"center",fontSize:12,color:"var(--gray)",marginTop:8}}>
          👀 閲覧のみ
        </div>
      )}
    </div>
  );
}

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
            <div className="login-logo-name">学習塾EFFORT授業用サイト</div>
            <div className="login-logo-sub">EFFORT LEARNING PORTAL</div>
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
          <div style={{marginBottom:0,paddingBottom:8}}>
            <iframe
              src={m.url}
              title={m.title}
              style={{width:"100%",height:"340px",border:"none",borderRadius:12,background:"var(--bg)",marginBottom:8}}
            />
            <a href={m.url} target="_blank" rel="noreferrer"
              style={{display:"block",textAlign:"center",padding:"10px",background:"var(--bg)",borderRadius:10,fontSize:13,fontWeight:700,color:"var(--gray)",textDecoration:"none",marginBottom:8}}>
              📂 別タブで開く
            </a>
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
  const isPdf   = ["PDF","スライド","授業前テスト","解答"].includes(m.sub);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="sheet-title">{m.icon} {m.title}</div>
          <div className="sheet-sub">
            <span className={`badge ${m.type==="class"?"badge-class":m.type==="pretest"?"badge-new":"badge-ans"}`}>{m.sub}</span>
            <span>配信日：{m.date}</span>
          </div>
        </div>
        <div className="sheet-body">
          {isVideo ? (
            <iframe className="sheet-iframe" src={m.url} title={m.title} allowFullScreen />
          ) : isPdf ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <iframe
                src={m.url}
                title={m.title}
                style={{width:"100%",height:"460px",border:"none",borderRadius:12,background:"var(--bg)"}}
              />
              <a href={m.url} target="_blank" rel="noreferrer"
                style={{display:"block",textAlign:"center",padding:"11px",background:"var(--bg)",borderRadius:10,fontSize:13,fontWeight:700,color:"var(--gray)",textDecoration:"none"}}>
                📂 別タブで開く
              </a>
            </div>
          ) : (
            <div className="sheet-file-box">
              <div className="sheet-file-icon">{m.icon}</div>
              <div className="sheet-file-hint">タップしてファイルを開く</div>
              <a href={m.url} target="_blank" rel="noreferrer" className="btn-open">📂 ファイルを開く</a>
            </div>
          )}
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
  const [testResults,  setTestResults]  = useState([]);
  const [sel,          setSel]          = useState(null);
  const [testTotal,    setTestTotal]    = useState("");
  const [testCorrect,  setTestCorrect]  = useState("");
  const [testSending,  setTestSending]  = useState(false);
  const [testMsg,      setTestMsg]      = useState("");
  const [schedule,     setSchedule]     = useState([]);
  const [studentGroups,setStudentGroups] = useState([]);

  const todayStr = new Date().toISOString().slice(0,10);

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
    const qTest = query(collection(db, "testResults"));
    const unsubTest = onSnapshot(qTest, snap => {
      setTestResults(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.studentId === studentInfo.studentId));
    });
    const unsubSched  = onSnapshot(query(collection(db,"schedule"),orderBy("date","asc")), snap => {
      setSchedule(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    const unsubGroups = onSnapshot(collection(db,"groups"), snap => {
      setStudentGroups(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return () => { unsubMat(); unsubSub(); unsubTest(); unsubSched(); unsubGroups(); };
  }, [studentInfo.studentId]);

  // 今日のテスト結果があるか
  const todayTest = testResults.find(t => t.date === todayStr);

  async function submitTest() {
    if (!testTotal || !testCorrect) { setTestMsg("⚠ 問題数と正解数を入力してください"); return; }
    if (parseInt(testCorrect) > parseInt(testTotal)) { setTestMsg("⚠ 正解数が問題数を超えています"); return; }
    setTestSending(true); setTestMsg("");
    try {
      await setDoc(doc(db, "testResults", `${studentInfo.studentId}_${todayStr}`), {
        studentId:   studentInfo.studentId,
        studentName: studentInfo.name,
        date:        todayStr,
        total:       parseInt(testTotal),
        correct:     parseInt(testCorrect),
        submittedAt: serverTimestamp(),
      });
      setTestMsg("✅ 送信しました！");
      setTestTotal(""); setTestCorrect("");
    } catch(e) {
      setTestMsg("⚠ 送信に失敗しました");
    }
    setTestSending(false);
  }

  const classItems    = materials.filter(m => m.type === "class");
  const answerItems   = materials.filter(m => m.type === "answer");
  const hwItems       = materials.filter(m => m.type === "hw");
  const hwSubmitItems = materials.filter(m => m.type === "hw");
  const pretestItems  = materials.filter(m => m.type === "pretest");

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

  const refTest    = useRef(null);
  const refClass   = useRef(null);
  const refAnswer  = useRef(null);
  const refHw      = useRef(null);
  const refSubmit  = useRef(null);

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // セクション開閉状態
  const [openSections, setOpenSections] = useState({test:true, class:true, hw:true});
  function toggleSection(key) { setOpenSections(s=>({...s,[key]:!s[key]})); }

  // 教科バッジ
  function SubjBadge({ subject }) {
    if (!subject) return null;
    const color = SUBJECT_COLORS[subject] || "#7f8c8d";
    return <span className="subj-badge" style={{background:color+"22",color,borderColor:color+"44"}}>{subject}</span>;
  }

  // 汎用カード
  function SCard({ m, extraBadge, iconBg, iconChar }) {
    return (
      <div className="s-card" onClick={()=>setSel(m)}>
        <div className="s-card-icon" style={{background:iconBg||"var(--blue-lt)"}}>{iconChar||m.icon}</div>
        <div className="s-card-body">
          <div className="s-card-title">{m.title}</div>
          <div className="s-card-meta">
            <SubjBadge subject={m.subject} />
            {extraBadge}
            <span className="tile-date">{m.date}</span>
            {m.deadline && <span className="tile-deadline">⚠ 期限 {m.deadline}</span>}
          </div>
        </div>
        <div className="s-card-arrow">›</div>
      </div>
    );
  }

  // 週間予定（今日から7日）
  const DAY_NAMES = ["日","月","火","水","木","金","土"];
  const weekDates = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()+i);
    return { date: d.toISOString().slice(0,10), dayName: DAY_NAMES[d.getDay()], dayNum: d.getDate(), isToday: i===0 };
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">🎓</span>
          <span className="topbar-name">学習塾EFFORT授業用サイト</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{studentInfo.name}（{studentInfo.grade}）</span>
          <button className="btn-top" onClick={onLogout}>ログアウト</button>
        </div>
      </div>

      <div className="page">
        {/* ヒーロー */}
        <div className="hero" style={{marginBottom:20}}>
          <div className="hero-name">こんにちは、{studentInfo.name} さん 👋</div>
          <div className="hero-grade">{studentInfo.grade}
            {studentInfo.groupId && studentGroups.find(g=>g.id===studentInfo.groupId) && (
              <span style={{marginLeft:8,fontSize:12,opacity:.8}}>🏫 {studentGroups.find(g=>g.id===studentInfo.groupId)?.name}</span>
            )}
          </div>
          <div className="hero-date">{TODAY}</div>
        </div>

        {/* ── 1. 今週の授業予定 ── */}
        <div className="s-section">
          <div className="s-section-head" style={{background:"linear-gradient(135deg,#004499,#0066CC)"}}
            onClick={()=>toggleSection("schedule")}>
            <span className="s-section-icon">📅</span>
            <span className="s-section-title">今週の授業予定</span>
            <span className="s-section-arrow">{openSections.schedule!==false?"›":"›"}</span>
          </div>
          <div className="week-wrap">
            {weekDates.map(({date,dayName,dayNum,isToday})=>{
              const myGroupId = studentInfo.groupId || "";
              const items = schedule.filter(s =>
                s.date === date &&
                (s.groupId === "all" || !s.groupId || s.groupId === myGroupId)
              );
              return (
                <div key={date} className={`day-card ${isToday?"today":""}`}>
                  <div className="day-label">
                    <div className="day-name">{dayName}</div>
                    <div className="day-date">{dayNum}</div>
                  </div>
                  <div className="day-content">
                    {items.length===0
                      ? <div className="day-empty">予定なし</div>
                      : items.map(item=>(
                          <div key={item.id} className="day-item">
                            <span className="day-subject" style={{background:(SUBJECT_COLORS[item.subject]||"#7f8c8d")+"22",color:SUBJECT_COLORS[item.subject]||"#7f8c8d"}}>
                              {item.subject}
                            </span>
                            <span className="day-text">{item.content}</span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. 授業前テスト ── */}
        <div className="s-section">
          <div className="s-section-head" style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)"}}
            onClick={()=>toggleSection("test")}>
            <span className="s-section-icon">🎯</span>
            <span className="s-section-title">授業前テスト</span>
            <span className="s-section-arrow">›</span>
          </div>
          {openSections.test!==false && <>
            {pretestItems.map(m=>(
              <SCard key={m.id} m={m} iconBg="#fde8e8" iconChar="🎯"
                extraBadge={<span className="badge" style={{background:"#fde8e8",color:"#e74c3c"}}>テストPDF</span>} />
            ))}
            {todayTest ? (
              <div className="test-done-card">
                <div className="test-done-icon">✅</div>
                <div>
                  <div className="test-done-title">本日の結果を送信済み</div>
                  <div className="test-done-score">
                    {todayTest.correct} / {todayTest.total} 問正解
                    <span style={{marginLeft:8,fontWeight:700,color:todayTest.correct/todayTest.total>=0.8?"var(--green)":"var(--orange)"}}>
                      （{Math.round(todayTest.correct/todayTest.total*100)}%）
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="test-card">
                <div style={{fontSize:13,color:"var(--gray)",marginBottom:14}}>今日のテスト結果を入力してください</div>
                <div className="test-input-row">
                  <div className="test-input-box">
                    <label>問題数</label>
                    <input type="number" min="1" max="100" value={testTotal} onChange={e=>setTestTotal(e.target.value)} placeholder="10" />
                  </div>
                  <div style={{display:"flex",alignItems:"center",paddingTop:24,fontSize:20,color:"var(--gray)",fontWeight:700}}>/</div>
                  <div className="test-input-box">
                    <label>正解数</label>
                    <input type="number" min="0" max="100" value={testCorrect} onChange={e=>setTestCorrect(e.target.value)} placeholder="8" />
                  </div>
                </div>
                {testTotal && testCorrect && parseInt(testCorrect)<=parseInt(testTotal) && (
                  <div className="test-score-preview">{Math.round(parseInt(testCorrect)/parseInt(testTotal)*100)}点</div>
                )}
                {testMsg && <div style={{fontSize:13,fontWeight:700,color:testMsg.startsWith("✅")?"var(--green)":"var(--red)",marginBottom:10,textAlign:"center"}}>{testMsg}</div>}
                <button className="test-submit-btn" onClick={submitTest} disabled={testSending}>
                  {testSending ? "送信中..." : "📨 結果を送信する"}
                </button>
              </div>
            )}
          </>}
        </div>

        {/* ── 3. 授業で使う資料 ── */}
        <div className="s-section">
          <div className="s-section-head" style={{background:"linear-gradient(135deg,#004499,#0066CC)"}}
            onClick={()=>toggleSection("class")}>
            <span className="s-section-icon">📚</span>
            <span className="s-section-title">授業で使う資料</span>
            <span className="s-section-count">{classItems.length}件</span>
            <span className="s-section-arrow">›</span>
          </div>
          {openSections.class!==false && (
            classItems.length===0
              ? <div className="empty"><div className="empty-icon">📭</div>授業資料はありません</div>
              : classItems.map(m=>(
                  <SCard key={m.id} m={m} iconBg="var(--blue-lt)" iconChar={m.icon}
                    extraBadge={<span className="badge badge-class">{m.sub}</span>} />
                ))
          )}
          {openSections.class!==false && answerItems.length>0 && (
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 10px",paddingLeft:4}}>
                <div style={{width:4,height:20,background:"var(--green)",borderRadius:2}} />
                <span style={{fontSize:14,fontWeight:900,color:"var(--green)"}}>解答</span>
              </div>
              {answerItems.map(m=>(
                <SCard key={m.id} m={m} iconBg="var(--green-lt)" iconChar="✅"
                  extraBadge={<span className="badge badge-ans">解答</span>} />
              ))}
            </>
          )}
        </div>

        {/* ── 4. 宿題 ── */}
        <div className="s-section">
          <div className="s-section-head" style={{background:"linear-gradient(135deg,#b7500a,var(--orange))"}}
            onClick={()=>toggleSection("hw")}>
            <span className="s-section-icon">✏️</span>
            <span className="s-section-title">宿題</span>
            <span className="s-section-count">{hwItems.length}件</span>
            <span className="s-section-arrow">›</span>
          </div>
          {openSections.hw!==false && (
            hwItems.length===0
              ? <div className="empty"><div className="empty-icon">🎉</div>現在の宿題はありません</div>
              : hwItems.map(m=>{
                  const mySub  = getMySubmission(m.id);
                  const checked = mySub?.status==="checked";
                  return (
                    <div key={m.id} className={`s-card ${checked?"checked":mySub?"submitted":""}`} onClick={()=>setSel(m)}>
                      <div className="s-card-icon" style={{background:"var(--orange-lt)"}}>📝</div>
                      <div className="s-card-body">
                        <div className="s-card-title">{m.title}</div>
                        <div className="s-card-meta">
                          <SubjBadge subject={m.subject} />
                          {checked && <span className="badge badge-done">👀 確認済み</span>}
                          {mySub && !checked && <span className="badge" style={{background:"var(--purple-lt)",color:"var(--purple)"}}>✅ 提出済</span>}
                          {!mySub && <span className="badge" style={{background:"var(--orange-lt)",color:"var(--orange)"}}>📬 未提出</span>}
                          {m.deadline && <span className="tile-deadline">⚠ 期限 {m.deadline}</span>}
                        </div>
                      </div>
                      <div className="s-card-arrow">›</div>
                    </div>
                  );
                })
          )}
        </div>

        {/* ── 5. ホワイトボード ── */}
        <div className="s-section">
          <div className="s-section-head" style={{background:"linear-gradient(135deg,#1a5276,#2e86de)"}}
            onClick={()=>toggleSection("wb")}>
            <span className="s-section-icon">🖊</span>
            <span className="s-section-title">ホワイトボード</span>
            <span style={{fontSize:12,color:"rgba(255,255,255,.7)",marginLeft:"auto",marginRight:8}}>先生とリアルタイム共有</span>
            <span className="s-section-arrow">›</span>
          </div>
          {openSections.wb!==false && (
            <>
              {/* 全体ボード（講師から全員向け） */}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{background:"#004499",color:"#fff",padding:"1px 8px",borderRadius:10,fontSize:11}}>全体</span>
                  講師からの全体ボード（閲覧のみ）
                </div>
                <Whiteboard boardId="global" boardLabel="全体ボード" readOnly={true} />
              </div>
              {/* グループボード */}
              {studentInfo.groupId && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{background:"#27ae60",color:"#fff",padding:"1px 8px",borderRadius:10,fontSize:11}}>グループ</span>
                    グループボード（閲覧のみ）
                  </div>
                  <Whiteboard boardId={`group_${studentInfo.groupId}`} boardLabel="グループボード" readOnly={true} />
                </div>
              )}
              {/* 個人ボード（双方向） */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{background:"#7b52ab",color:"#fff",padding:"1px 8px",borderRadius:10,fontSize:11}}>個人</span>
                  自分のボード（先生と共有・書き込み可）
                </div>
                <Whiteboard boardId={`student_${studentInfo.studentId}`} boardLabel={studentInfo.name} readOnly={false} />
              </div>
            </>
          )}
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
// SCHEDULE TAB（授業予定・講師用）
// ─────────────────────────────────────────
function ScheduleTab({ students, groups }) {
  const DAY_NAMES = ["日","月","火","水","木","金","土"];
  const [scheduleItems, setScheduleItems] = useState([]);
  const [form, setForm] = useState({ date:"", subject:"英語", content:"", groupId:"all" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db,"schedule"),orderBy("date","asc")), snap => {
      setScheduleItems(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  }, []);

  // 今日から7日
  const weekDates = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()+i);
    return { date: d.toISOString().slice(0,10), dayName: DAY_NAMES[d.getDay()], dayNum: d.getDate(), isToday: i===0 };
  });

  async function handleAdd() {
    if (!form.date || !form.content) { setMsg("⚠ 日付と内容を入力してください"); return; }
    setSaving(true); setMsg("");
    try {
      await addDoc(collection(db,"schedule"), {
        date: form.date, subject: form.subject, content: form.content, groupId: form.groupId||"all",
        createdAt: serverTimestamp(),
      });
      setMsg("✅ 追加しました");
      setForm(f=>({...f, content:""}));
    } catch(e) { setMsg("⚠ エラー："+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db,"schedule",id));
  }

  return (
    <>
      {/* 追加フォーム */}
      <div className="form-card" style={{marginBottom:20}}>
        <h2>📅 授業予定を追加</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div className="form-row" style={{margin:0}}>
            <label>日付</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          </div>
          <div className="form-row" style={{margin:0}}>
            <label>教科</label>
            <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
              {SUBJECTS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <label>対象グループ</label>
          <select value={form.groupId} onChange={e=>setForm(f=>({...f,groupId:e.target.value}))}>
            <option value="all">全グループ共通</option>
            {(groups||[]).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>授業内容</label>
          <input value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}
            placeholder="例：二次方程式の解き方・長文読解テスト" onKeyDown={e=>e.key==="Enter"&&handleAdd()} />
        </div>
        <button className="btn-submit" onClick={handleAdd} disabled={saving}>
          {saving?"追加中...":"＋ 追加する"}
        </button>
        {msg && <span style={{marginLeft:12,fontSize:13,fontWeight:700,color:msg.startsWith("✅")?"var(--green)":"var(--red)"}}>{msg}</span>}
      </div>

      {/* 週間カレンダー */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {weekDates.map(({date,dayName,dayNum,isToday})=>{
          const items = scheduleItems.filter(s=>s.date===date);
          return (
            <div key={date} style={{
              background:"#fff",borderRadius:14,padding:"14px 16px",
              boxShadow:"0 2px 8px rgba(0,0,0,.055)",
              border: isToday?"2px solid var(--blue)":"2px solid transparent",
              background: isToday?"var(--blue-lt)":"#fff"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:items.length>0?10:0}}>
                <div style={{textAlign:"center",minWidth:44}}>
                  <div style={{fontSize:11,fontWeight:900,color:isToday?"var(--blue)":"var(--gray)"}}>{dayName}曜日</div>
                  <div style={{fontSize:20,fontWeight:900,color:isToday?"var(--blue)":"var(--navy)"}}>{dayNum}</div>
                </div>
                {items.length===0 && <div style={{fontSize:13,color:"var(--gray)",fontStyle:"italic"}}>予定なし</div>}
              </div>
              {items.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderTop:"1px solid var(--border)"}}>
                  <span style={{
                    fontSize:12,fontWeight:900,padding:"2px 10px",borderRadius:10,flexShrink:0,
                    background:(SUBJECT_COLORS[item.subject]||"#7f8c8d")+"22",
                    color:SUBJECT_COLORS[item.subject]||"#7f8c8d"
                  }}>{item.subject}</span>
                  <span style={{fontSize:14,flex:1}}>{item.content}</span>
                  <button className="btn-del" onClick={()=>handleDelete(item.id)} style={{flexShrink:0}}>削除</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// TEACHER WHITEBOARD TAB
// ─────────────────────────────────────────
function TeacherWhiteboardTab({ students, groups }) {
  const [boardType, setBoardType] = useState("global"); // global | group | student
  const [selectedGroupId,   setSelectedGroupId]   = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId)     setSelectedGroupId(groups[0].id);
    if (students.length > 0 && !selectedStudentId) setSelectedStudentId(students[0].studentId);
  }, [groups, students]);

  const BOARD_TYPES = [
    { id:"global",  label:"🌐 全体ボード",    desc:"全生徒に表示されます" },
    { id:"group",   label:"🏫 グループボード", desc:"グループ別に表示されます" },
    { id:"student", label:"👤 個人ボード",    desc:"生徒と1対1で共有" },
  ];

  function getBoardId() {
    if (boardType==="global")  return "global";
    if (boardType==="group")   return `group_${selectedGroupId}`;
    if (boardType==="student") return `student_${selectedStudentId}`;
    return "global";
  }

  function getBoardLabel() {
    if (boardType==="global")  return "全体ボード";
    if (boardType==="group")   return groups.find(g=>g.id===selectedGroupId)?.name||"グループボード";
    if (boardType==="student") return students.find(s=>s.studentId===selectedStudentId)?.name||"個人ボード";
    return "";
  }

  return (
    <>
      {/* ボード種別選択 */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {BOARD_TYPES.map(bt=>(
          <button key={bt.id}
            className={`wb-student-btn ${boardType===bt.id?"active":""}`}
            style={{flex:"1 1 auto"}}
            onClick={()=>setBoardType(bt.id)}>
            {bt.label}
          </button>
        ))}
      </div>

      {/* グループ選択 */}
      {boardType==="group" && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",marginBottom:6}}>グループを選択</div>
          <div className="wb-student-select">
            {groups.map(g=>(
              <button key={g.id}
                className={`wb-student-btn ${selectedGroupId===g.id?"active":""}`}
                onClick={()=>setSelectedGroupId(g.id)}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 生徒選択 */}
      {boardType==="student" && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",marginBottom:6}}>生徒を選択</div>
          <div className="wb-student-select">
            {students.map(s=>(
              <button key={s.id}
                className={`wb-student-btn ${selectedStudentId===s.studentId?"active":""}`}
                onClick={()=>setSelectedStudentId(s.studentId)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ボードの説明バナー */}
      <div style={{
        display:"flex",alignItems:"center",gap:10,marginBottom:12,
        padding:"12px 16px",borderRadius:12,
        background: boardType==="global"?"var(--blue-lt)": boardType==="group"?"var(--green-lt)":"var(--purple-lt)",
      }}>
        <span style={{fontSize:20}}>{boardType==="global"?"🌐":boardType==="group"?"🏫":"👤"}</span>
        <div>
          <div style={{fontWeight:900,fontSize:15,color:"var(--navy)"}}>{getBoardLabel()}</div>
          <div style={{fontSize:12,color:"var(--gray)"}}>
            {BOARD_TYPES.find(b=>b.id===boardType)?.desc}・リアルタイム同期
          </div>
        </div>
      </div>

      {/* ホワイトボード本体 */}
      <Whiteboard
        boardId={getBoardId()}
        boardLabel={getBoardLabel()}
        readOnly={false}
      />
    </>
  );
}

// ─────────────────────────────────────────
// RECORDS TAB（講師用・成績一覧）
// ─────────────────────────────────────────
function RecordsTab({ students, testResults, submissions }) {
  const [filterStudent, setFilterStudent] = useState("all");

  // 過去30日の日付リストを生成
  const dates = Array.from({length:30}, (_,i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0,10);
  });

  const filteredStudents = filterStudent === "all"
    ? students
    : students.filter(s => s.studentId === filterStudent);

  return (
    <>
      {/* 生徒フィルター */}
      <div className="sub-filter" style={{marginBottom:16}}>
        <button className={`sub-filter-btn ${filterStudent==="all"?"active":""}`} onClick={()=>setFilterStudent("all")}>全員</button>
        {students.map(s => (
          <button key={s.id} className={`sub-filter-btn ${filterStudent===s.studentId?"active":""}`}
            onClick={()=>setFilterStudent(s.studentId)}>
            {s.name}
          </button>
        ))}
      </div>

      {filteredStudents.map(student => {
        const studentTests = testResults.filter(t => t.studentId === student.studentId);
        const studentSubs  = submissions.filter(s => s.studentId === student.studentId);

        return (
          <div key={student.id} style={{background:"var(--white)",borderRadius:14,marginBottom:20,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.055)"}}>
            {/* 生徒ヘッダー */}
            <div style={{background:"var(--navy)",color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13}}>
                {student.name[0]}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:14}}>{student.name}</div>
                <div style={{fontSize:11,opacity:.7}}>{student.grade}</div>
              </div>
            </div>

            {/* 日付ごとの一覧 */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
                <thead>
                  <tr style={{background:"var(--bg)"}}>
                    <th style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--gray)",whiteSpace:"nowrap"}}>日付</th>
                    <th style={{padding:"9px 14px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--gray)",whiteSpace:"nowrap"}}>テスト結果</th>
                    <th style={{padding:"9px 14px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--gray)",whiteSpace:"nowrap"}}>宿題提出</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map(date => {
                    const test = studentTests.find(t => t.date === date);
                    const sub  = studentSubs.find(s => {
                      const subDate = s.submittedAt?.toDate?.()?.toISOString?.()?.slice(0,10);
                      return subDate === date;
                    });
                    if (!test && !sub) return null;
                    return (
                      <tr key={date} style={{borderTop:"1px solid var(--border)"}}>
                        <td style={{padding:"11px 14px",fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
                          {date.replace(/(\d{4})-(\d{2})-(\d{2})/,"$2/$3")}
                        </td>
                        <td style={{padding:"11px 14px",textAlign:"center"}}>
                          {test ? (
                            <span style={{
                              fontWeight:700,fontSize:13,
                              color: test.correct/test.total >= 0.8 ? "var(--green)" : test.correct/test.total >= 0.6 ? "var(--orange)" : "var(--red)"
                            }}>
                              {test.correct}/{test.total}問
                              （{Math.round(test.correct/test.total*100)}%）
                            </span>
                          ) : <span style={{color:"var(--border)",fontSize:12}}>—</span>}
                        </td>
                        <td style={{padding:"11px 14px",textAlign:"center"}}>
                          {sub ? (
                            <span style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>
                              ✅ {sub.status==="checked" ? "確認済" : "提出済"}
                            </span>
                          ) : <span style={{color:"var(--border)",fontSize:12}}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {studentTests.length===0 && studentSubs.length===0 && (
                    <tr><td colSpan={3} style={{textAlign:"center",padding:"20px",color:"var(--gray)",fontSize:13}}>記録がありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}


// ─────────────────────────────────────────
// GROUPS TAB（グループ管理）
// ─────────────────────────────────────────
function GroupsTab({ groups, students }) {
  const GRADES = ["小学1年","小学2年","小学3年","小学4年","小学5年","小学6年",
                  "中学1年","中学2年","中学3年","高校1年","高校2年","高校3年","その他"];
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade]           = useState("中学1年");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [delTarget, setDelTarget]   = useState(null);

  async function handleAdd() {
    if (!schoolName.trim()) { setMsg("⚠ 学校名を入力してください"); return; }
    const name = `${schoolName.trim()} ${grade}`;
    if (groups.find(g=>g.name===name)) { setMsg("⚠ 同じグループがすでにあります"); return; }
    setSaving(true); setMsg("");
    try {
      await addDoc(collection(db,"groups"), {
        name, schoolName: schoolName.trim(), grade,
        createdAt: serverTimestamp(),
      });
      setMsg("✅ 作成しました");
      setSchoolName("");
    } catch(e) { setMsg("⚠ エラー："+e.message); }
    setSaving(false);
  }

  async function handleDelete(g) {
    // グループに属する生徒のgroupIdをクリア
    const members = students.filter(s=>s.groupId===g.id);
    for (const s of members) {
      await updateDoc(doc(db,"students",s.studentId), {groupId:""});
    }
    await deleteDoc(doc(db,"groups",g.id));
    setDelTarget(null);
  }

  // グループ別に生徒を表示
  const grouped = groups.map(g=>({
    ...g,
    members: students.filter(s=>s.groupId===g.id)
  }));
  const ungrouped = students.filter(s=>!s.groupId||!groups.find(g=>g.id===s.groupId));

  return (
    <>
      {/* 作成フォーム */}
      <div className="form-card" style={{marginBottom:20}}>
        <h2>🏫 グループを作成</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-row" style={{margin:0}}>
            <label>学校名</label>
            <input value={schoolName} onChange={e=>setSchoolName(e.target.value)}
              placeholder="例：〇〇中学校" onKeyDown={e=>e.key==="Enter"&&handleAdd()} />
          </div>
          <div className="form-row" style={{margin:0}}>
            <label>学年</label>
            <select value={grade} onChange={e=>setGrade(e.target.value)}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginTop:8,padding:"8px 12px",background:"var(--bg)",borderRadius:8,fontSize:13,color:"var(--gray)"}}>
          グループ名：<strong>{schoolName||"学校名"}　{grade}</strong>
        </div>
        <button className="btn-submit" onClick={handleAdd} disabled={saving} style={{marginTop:12}}>
          {saving?"作成中...":"＋ グループを作成"}
        </button>
        {msg && <span style={{marginLeft:12,fontSize:13,fontWeight:700,color:msg.startsWith("✅")?"var(--green)":"var(--red)"}}>{msg}</span>}
      </div>

      {/* グループ一覧 */}
      {grouped.map(g=>(
        <div key={g.id} style={{background:"#fff",borderRadius:14,marginBottom:16,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.055)"}}>
          <div style={{background:"var(--navy)",color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🏫</span>
            <span style={{fontWeight:900,fontSize:15,flex:1}}>{g.name}</span>
            <span style={{fontSize:12,opacity:.7}}>{g.members.length}名</span>
            <button className="btn-del" style={{color:"#faa",borderColor:"#faa"}}
              onClick={()=>setDelTarget(g)}>削除</button>
          </div>
          {g.members.length===0
            ? <div style={{padding:"16px",fontSize:13,color:"var(--gray)",fontStyle:"italic"}}>生徒が登録されていません</div>
            : <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"var(--bg)"}}>
                  <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--gray)"}}>名前</th>
                  <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--gray)"}}>学年</th>
                  <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"var(--gray)"}}>ID</th>
                </tr></thead>
                <tbody>
                  {g.members.map(s=>(
                    <tr key={s.id} style={{borderTop:"1px solid var(--border)"}}>
                      <td style={{padding:"10px 14px",fontWeight:700,fontSize:13}}>{s.name}</td>
                      <td style={{padding:"10px 14px",fontSize:13,color:"var(--gray)"}}>{s.grade}</td>
                      <td style={{padding:"10px 14px",fontSize:12,fontFamily:"monospace",color:"var(--gray)"}}>{s.studentId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      ))}

      {/* グループなしの生徒 */}
      {ungrouped.length>0 && (
        <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.055)"}}>
          <div style={{background:"var(--gray)",color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>👤</span>
            <span style={{fontWeight:900,fontSize:15,flex:1}}>グループ未設定</span>
            <span style={{fontSize:12,opacity:.7}}>{ungrouped.length}名</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>
              {ungrouped.map(s=>(
                <tr key={s.id} style={{borderTop:"1px solid var(--border)"}}>
                  <td style={{padding:"10px 14px",fontWeight:700,fontSize:13}}>{s.name}</td>
                  <td style={{padding:"10px 14px",fontSize:13,color:"var(--gray)"}}>{s.grade}</td>
                  <td style={{padding:"10px 14px",fontSize:12,fontFamily:"monospace",color:"var(--gray)"}}>{s.studentId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 削除確認 */}
      {delTarget && (
        <div className="del-overlay" onClick={()=>setDelTarget(null)}>
          <div className="del-modal" onClick={e=>e.stopPropagation()}>
            <div className="del-icon-big">🏫</div>
            <div className="del-title">「{delTarget.name}」を削除しますか？</div>
            <div className="del-sub">グループは削除されますが、生徒データは残ります。<br/>生徒のグループ設定がリセットされます。</div>
            <div className="del-btns">
              <button className="btn-cancel" onClick={()=>setDelTarget(null)}>キャンセル</button>
              <button className="btn-del-confirm" onClick={()=>handleDelete(delTarget)}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────
// STUDENTS PANEL（講師用）
// ─────────────────────────────────────────
function StudentsPanel({ students, groups }) {
  const GRADES = ["小学1年","小学2年","小学3年","小学4年","小学5年","小学6年",
                  "中学1年","中学2年","中学3年","高校1年","高校2年","高校3年","その他"];
  const BLANK = { name:"", grade:"中学1年", studentId:"", email:"", password:"", groupId:"" };
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

  const [editTarget, setEditTarget] = useState(null); // 編集対象
  const [editForm, setEditForm]     = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg]       = useState("");

  function openEdit(s) {
    setEditTarget(s);
    setEditForm({ name: s.name, grade: s.grade, groupId: s.groupId||"" });
    setEditMsg("");
  }

  async function handleEditSave() {
    if (!editForm.name.trim()) { setEditMsg("⚠ 名前を入力してください"); return; }
    setEditSaving(true); setEditMsg("");
    try {
      await updateDoc(doc(db, "students", editTarget.studentId), {
        name:    editForm.name.trim(),
        grade:   editForm.grade,
        groupId: editForm.groupId || "",
      });
      setEditMsg("✅ 保存しました");
      setTimeout(() => setEditTarget(null), 800);
    } catch(e) {
      setEditMsg("⚠ エラー：" + e.message);
    }
    setEditSaving(false);
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
            <label>グループ（任意）</label>
            <select value={form.groupId} onChange={e=>setForm(f=>({...f,groupId:e.target.value}))}>
              <option value="">グループなし</option>
              {(groups||[]).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
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
                  <button className="btn-edit" style={{marginRight:4}} onClick={()=>openEdit(s)}>編集</button>
                  <button className="btn-edit" onClick={()=>{setPwTarget(s);setNewPw("");setPwMsg("");setShowNewPw(false);}}>PW変更</button>
                  <button className="btn-del" onClick={()=>setDelTarget(s)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 編集モーダル */}
      {editTarget && (
        <div className="center-overlay" onClick={()=>setEditTarget(null)}>
          <div className="center-modal" onClick={e=>e.stopPropagation()}>
            <div className="cmodal-head">
              <span className="cmodal-title">✏️ {editTarget.name} の情報を編集</span>
              <button className="cmodal-close" onClick={()=>setEditTarget(null)}>×</button>
            </div>
            <div className="cmodal-body">
              <div className="form-row">
                <label>名前</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div className="form-row">
                <label>学年</label>
                <select value={editForm.grade} onChange={e=>setEditForm(f=>({...f,grade:e.target.value}))}>
                  {GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>グループ（学校・学年）</label>
                <select value={editForm.groupId} onChange={e=>setEditForm(f=>({...f,groupId:e.target.value}))}>
                  <option value="">グループなし</option>
                  {(groups||[]).map(g=>(
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              {editForm.groupId==="" && (
                <div style={{padding:"10px 14px",background:"var(--orange-lt)",borderRadius:10,fontSize:12,color:"var(--orange)",fontWeight:700}}>
                  ⚠ グループ未設定の場合、授業予定がグループ別に表示されません。<br/>
                  先に「🏫 グループ」タブでグループを作成してください。
                </div>
              )}
              {editMsg && (
                <div style={{marginTop:10,padding:"10px 14px",background:editMsg.startsWith("✅")?"var(--green-lt)":"var(--red-lt)",borderRadius:8,fontSize:13,fontWeight:700,color:editMsg.startsWith("✅")?"var(--green)":"var(--red)"}}>
                  {editMsg}
                </div>
              )}
            </div>
            <div className="cmodal-foot">
              <button className="btn-cancel" onClick={()=>setEditTarget(null)}>キャンセル</button>
              <button className="btn-save" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "保存中..." : "💾 保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

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
  const [testResults, setTestResults] = useState([]);
  const [schedule,    setSchedule]    = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [form,        setForm]        = useState({ title:"", sub:"PDF", subject:"英語", url:"", deadline:"", targets:[] });
  const [uploadFile,  setUploadFile]  = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [done,        setDone]        = useState(false);

  useEffect(() => {
    const unsubS   = onSnapshot(collection(db, "students"),  snap => setStudentsState(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubM   = onSnapshot(query(collection(db,"materials"),orderBy("date","desc")), snap => setMaterials(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubSub = onSnapshot(query(collection(db,"submissions"),orderBy("submittedAt","desc")), snap => setSubmissions(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubTest  = onSnapshot(query(collection(db,"testResults"),orderBy("date","desc")), snap => setTestResults(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubSched  = onSnapshot(query(collection(db,"schedule"),orderBy("date","asc")), snap => setSchedule(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubGroups = onSnapshot(collection(db,"groups"), snap => setGroups(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { unsubS(); unsubM(); unsubSub(); unsubTest(); unsubSched(); unsubGroups(); };
  }, []);

  // ── 教材配信 ──
  async function handleUpload() {
    if (!form.title || form.targets.length===0) { alert("タイトルと対象生徒を入力してください"); return; }
    if (!uploadFile && !form.url) { alert("ファイルをアップロードするかURLを入力してください"); return; }
    setUploading(true);
    try {
      let finalUrl = form.url;
      // ファイルアップロードの場合はStorageに保存
      if (uploadFile) {
        const fileId = `materials/${Date.now()}_${uploadFile.name}`;
        const fileRef = ref(storage, fileId);
        await uploadBytes(fileRef, uploadFile);
        finalUrl = await getDownloadURL(fileRef);
      }
      const icon = SUB_TO_ICON[form.sub] || "📄";
      const type = SUB_TO_TYPE[form.sub] || "class";
      await addDoc(collection(db, "materials"), {
        title: form.title, sub: form.sub, subject: form.subject||"その他", type, icon, url: finalUrl,
        date: new Date().toISOString().slice(0,10),
        targets: form.targets,
        ...(form.deadline ? {deadline: form.deadline} : {}),
        createdAt: serverTimestamp(),
      });
      setDone(true); setTimeout(()=>setDone(false),2500);
      setForm({title:"",sub:"PDF",url:"",deadline:"",targets:[]});
      setUploadFile(null);
    } catch(e) {
      alert("アップロードエラー：" + e.message);
    }
    setUploading(false);
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
    {id:"home",       label:"🏠 ホーム"},
    {id:"schedule",   label:"📅 予定"},
    {id:"upload",     label:"📤 配信"},
    {id:"list",       label:"📋 一覧"},
    {id:"submissions",label:"📬 提出物", badge:uncheckedCount},
    {id:"whiteboard", label:"🖊 ボード"},
    {id:"records",    label:"📊 成績"},
    {id:"students",   label:"👥 生徒"},
    {id:"groups",     label:"🏫 グループ"},
  ];

  function toggleTarget(id) {
    setForm(f=>({...f,targets:f.targets.includes(id)?f.targets.filter(x=>x!==id):[...f.targets,id]}));
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar">
        <div className="topbar-left"><span className="topbar-logo">🎓</span><span className="topbar-name">学習塾EFFORT授業用サイト</span></div>
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
                <option>PDF</option><option>スライド</option><option>動画</option><option>宿題</option><option>解答</option><option>授業前テスト</option>
              </select>
            </div>
            <div className="form-row"><label>教科</label>
              <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
                {SUBJECTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>ファイルをアップロード（PDF・画像）</label>
              <div style={{border:"2px dashed var(--border)",borderRadius:10,padding:"16px",background:"var(--bg)",textAlign:"center",position:"relative",cursor:"pointer"}}
                onClick={()=>document.getElementById("file-upload").click()}>
                <input id="file-upload" type="file" accept=".pdf,image/*"
                  style={{display:"none"}}
                  onChange={e=>{setUploadFile(e.target.files[0]);setForm(f=>({...f,url:""}))}} />
                {uploadFile
                  ? <div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>✅ {uploadFile.name}</div>
                  : <div style={{fontSize:13,color:"var(--gray)"}}>📎 タップしてファイルを選択<br/><span style={{fontSize:11}}>PDF・画像に対応</span></div>
                }
              </div>
            </div>
            <div className="form-row">
              <label>またはURL（YouTube動画・外部リンク）</label>
              <input value={form.url} onChange={e=>{setForm(f=>({...f,url:e.target.value}));setUploadFile(null)}} placeholder="https://..." />
            </div>
            {form.sub==="宿題" && <div className="form-row"><label>提出期限</label><input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></div>}
            <div className="form-row">
              <label>グループで一括選択（任意）</label>
              <div className="chk-group">
                {groups.map(g=>{
                  const memberIds = students.filter(s=>s.groupId===g.id).map(s=>s.studentId);
                  const allSelected = memberIds.length>0 && memberIds.every(id=>form.targets.includes(id));
                  return (
                    <label key={g.id} className={`chk-label ${allSelected?"checked":""}`}>
                      <input type="checkbox" checked={allSelected}
                        onChange={()=>{
                          if(allSelected) setForm(f=>({...f,targets:f.targets.filter(id=>!memberIds.includes(id))}));
                          else setForm(f=>({...f,targets:[...new Set([...f.targets,...memberIds])]}));
                        }}/>
                      🏫 {g.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="form-row">
              <label>対象生徒（個別選択）</label>
              <div className="chk-group">
                {groups.length>0 ? groups.map(g=>{
                  const members = students.filter(s=>s.groupId===g.id);
                  if(members.length===0) return null;
                  return (
                    <div key={g.id} style={{width:"100%",marginBottom:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--gray)",marginBottom:4,letterSpacing:.5}}>🏫 {g.name}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                        {members.map(s=>(
                          <label key={s.id} className={`chk-label ${form.targets.includes(s.studentId)?"checked":""}`}>
                            <input type="checkbox" checked={form.targets.includes(s.studentId)} onChange={()=>toggleTarget(s.studentId)}/>{s.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }) : students.map(s=>(
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
            <button className="btn-submit" onClick={handleUpload} disabled={uploading}>{uploading ? "アップロード中..." : "📤 配信する"}</button>
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

        {tab==="schedule" && (
          <ScheduleTab students={students} groups={groups} />
        )}

        {tab==="whiteboard" && (
          <TeacherWhiteboardTab students={students} groups={groups} />
        )}

        {tab==="records" && (
          <RecordsTab students={students} testResults={testResults} submissions={submissions} />
        )}

        {/* STUDENTS */}
        {tab==="students" && (
          <StudentsPanel students={students} groups={groups} />
        )}

        {tab==="groups" && (
          <GroupsTab groups={groups} students={students} />
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
