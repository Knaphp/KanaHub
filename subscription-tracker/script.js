// ── FIREBASE IMPORTS ───────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc,
  deleteDoc, doc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CONFIG ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDBOuyfHre1_CE3dWCkJuo7LLfiaFcBiys",
  authDomain:        "kanahub-a4f9a.firebaseapp.com",
  projectId:         "kanahub-a4f9a",
  storageBucket:     "kanahub-a4f9a.firebasestorage.app",
  messagingSenderId: "587364108316",
  appId:             "1:587364108316:web:21d46aba7b8382767977d9",
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── CONSTANTS ──────────────────────────────────────────────
const CATS = [
  'Streaming','Music','Software','Gaming',
  'News','Fitness','Cloud','Shopping','Finance','Other'
];
const BG = {
  Streaming:'#5B6EE8', Music:'#E8A838',    Software:'#6B9FE8',
  Gaming:   '#E85B8A', News:'#7B8794',     Fitness:'#6BB86B',
  Cloud:    '#5BA8E8', Shopping:'#E87B3B', Finance:'#3BBFB8',
  Other:    '#8B7BE8',
};

// ── STATE ──────────────────────────────────────────────────
let subs        = [];
let currentUser = null;
let unsubscribe = null;   // firestore listener cleanup
let dragSrcId   = null;

// ── UTILS ──────────────────────────────────────────────────
function nextDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function monthCost(s) {
  if (s.status === 'cancelled') return 0;
  if (s.cycle  === 'yearly')   return s.cost / 12;
  if (s.cycle  === 'weekly')   return s.cost * 4.33;
  return s.cost;
}
function daysUntil(dateStr) {
  const t = new Date(dateStr), n = new Date();
  n.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return Math.round((t - n) / 86400000);
}
function fmt(n) { return '฿' + Math.round(n).toLocaleString('th-TH'); }
function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
function showStatus(msg, isError = false) {
  const el = document.getElementById('statusEl');
  if (!el) return;
  el.textContent = msg;
  el.style.color   = isError ? '#ff6b6b' : '#b8ff4f';
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 2500);
}

// ── AUTH UI ────────────────────────────────────────────────
function renderAuthBar(user) {
  const bar = document.getElementById('authBar');
  if (user) {
    bar.innerHTML = `
      <img src="${user.photoURL}" alt="avatar"
        style="width:28px;height:28px;border-radius:50%;object-fit:cover;"/>
      <span style="font-size:13px;color:var(--muted)">${user.displayName}</span>
      <button id="logoutBtn" class="btn-logout">ออกจากระบบ</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
  } else {
    bar.innerHTML = `
      <button id="loginBtn" class="btn-login">
        <svg width="16" height="16" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:6px">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
          <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-4.2-13.6-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      </button>
    `;
    document.getElementById('loginBtn').addEventListener('click', login);
  }
}

function showLoginScreen() {
  document.getElementById('appContent').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}
function showAppScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display  = 'block';
}

// ── AUTH ACTIONS ───────────────────────────────────────────
async function login() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    showStatus('Login ไม่สำเร็จ: ' + e.message, true);
  }
}

// ── FIRESTORE ──────────────────────────────────────────────
function getUserCol(uid) {
  // each user gets their own subcollection: users/{uid}/subscriptions
  return collection(db, 'users', uid, 'subscriptions');
}

function startListener(uid) {
  if (unsubscribe) unsubscribe(); // stop previous listener
  const q = query(getUserCol(uid), orderBy('order', 'asc'));
  unsubscribe = onSnapshot(q, (snapshot) => {
    subs = snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error(err);
    showStatus('เชื่อมต่อ Firebase ไม่ได้', true);
  });
}

async function addSub(data) {
  try {
    data.order = subs.length;
    await addDoc(getUserCol(currentUser.uid), data);
    showStatus('เพิ่มแล้ว ✓');
  } catch (e) { showStatus('เพิ่มไม่ได้: ' + e.message, true); }
}

async function updateSub(firestoreId, data) {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid, 'subscriptions', firestoreId), data);
    showStatus('บันทึกแล้ว ✓');
  } catch (e) { showStatus('บันทึกไม่ได้: ' + e.message, true); }
}

async function deleteSub(firestoreId) {
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'subscriptions', firestoreId));
    showStatus('ลบแล้ว ✓');
  } catch (e) { showStatus('ลบไม่ได้: ' + e.message, true); }
}

// ── DRAG & DROP ────────────────────────────────────────────
function onDragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => document.querySelector(`[data-id="${id}"]`)?.classList.add('dragging'), 0);
}
function onDragEnd() {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('dragging','drag-over'));
  dragSrcId = null;
}
function onDragOver(e, id) {
  e.preventDefault();
  document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
  if (id !== dragSrcId) document.querySelector(`[data-id="${id}"]`)?.classList.add('drag-over');
}
async function onDrop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
  if (!dragSrcId || dragSrcId === targetId) return;
  const si = subs.findIndex(s => s.firestoreId === dragSrcId);
  const ti = subs.findIndex(s => s.firestoreId === targetId);
  if (si < 0 || ti < 0) return;
  const reordered = [...subs];
  const [moved] = reordered.splice(si, 1);
  reordered.splice(ti, 0, moved);
  await Promise.all(
    reordered.map((s, i) =>
      updateDoc(doc(db, 'users', currentUser.uid, 'subscriptions', s.firestoreId), { order: i })
    )
  );
}

// ── RENDER ─────────────────────────────────────────────────
function render() {
  const q    = document.getElementById('searchEl').value.toLowerCase();
  const list = subs.filter(s => !q || s.name.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q));

  const active  = subs.filter(s => s.status === 'active');
  const monthly = active.reduce((a, s) => a + monthCost(s), 0);
  document.getElementById('statMonthly').textContent = fmt(monthly);
  document.getElementById('statYearly').textContent  = fmt(monthly * 12);
  document.getElementById('statCount').textContent   = active.length;

  const soon = subs.filter(s => s.status==='active' && daysUntil(s.renew)<=3 && daysUntil(s.renew)>=0);
  document.getElementById('alertEl').innerHTML = soon.length
    ? `<div class="alert-bar">⚡ ต่ออายุเร็วๆ นี้: ${soon.map(s=>`<b>${s.name}</b> (${daysUntil(s.renew)} วัน)`).join(' · ')}</div>`
    : '';

  const grid = document.getElementById('gridEl');
  if (!list.length) { grid.innerHTML = '<div class="empty">ยังไม่มี subscription</div>'; return; }

  grid.innerHTML = '';
  list.forEach(s => {
    const days       = daysUntil(s.renew);
    const isActive   = s.status === 'active';
    const isPaused   = s.status === 'paused';
    const bg         = BG[s.cat] || '#6B7280';
    const initials   = s.name.slice(0, 2).toUpperCase();
    const cycleLabel = s.cycle==='monthly'?'Per month': s.cycle==='yearly'?'Per year':'Per week';
    let badgeText = '';
    if      (isPaused)                 badgeText = 'paused';
    else if (s.status==='cancelled')   badgeText = 'cancelled';
    else if (days < 0)                 badgeText = 'expired';
    else if (days === 0)               badgeText = 'today!';
    else if (days <= 3)                badgeText = `${days}d!`;
    const badgeColor = (days<=3 && isActive) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';

    const card = document.createElement('div');
    card.className      = 'card';
    card.dataset.id     = s.firestoreId;
    card.draggable      = true;
    card.style.background = isActive ? bg : '#1e1e28';
    card.style.opacity    = isPaused ? '0.6' : '1';
    card.innerHTML = `
      <div class="card-icon">${initials}</div>
      <div class="card-mid">
        <div class="card-name">${s.name}</div>
        <div class="card-date">${fmtDate(s.renew)}</div>
      </div>
      <div class="card-right">
        <div class="card-cost">${fmt(s.cost)}</div>
        <div class="card-cycle">${cycleLabel}</div>
      </div>
      ${badgeText ? `<div class="card-badge" style="color:${badgeColor}">${badgeText}</div>` : ''}
      <div class="card-actions">
        <button onclick="openEdit('${s.firestoreId}');event.stopPropagation()">แก้ไข</button>
        <button onclick="confirmDelete('${s.firestoreId}');event.stopPropagation()">ลบ</button>
      </div>`;
    card.addEventListener('dragstart', e => onDragStart(e, s.firestoreId));
    card.addEventListener('dragend',   onDragEnd);
    card.addEventListener('dragover',  e => onDragOver(e, s.firestoreId));
    card.addEventListener('drop',      e => onDrop(e, s.firestoreId));
    card.addEventListener('click',     () => openEdit(s.firestoreId));
    grid.appendChild(card);
  });
}

// ── MODAL ──────────────────────────────────────────────────
function openAdd()    { showModal(null); }
function openEdit(id) { showModal(subs.find(s => s.firestoreId === id)); }

function showModal(sub) {
  const isEdit = !!sub;
  document.getElementById('modalBg').classList.add('open');
  document.getElementById('modalEl').innerHTML = `
    <h2>${isEdit ? 'แก้ไข' : 'เพิ่ม'} subscription</h2>
    <div class="field"><label>ชื่อ</label>
      <input id="m_name" value="${sub?.name||''}" placeholder="เช่น Netflix" autofocus/></div>
    <div class="row2">
      <div class="field"><label>Category</label>
        <select id="m_cat">${CATS.map(c=>`<option${sub?.cat===c?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label>
        <select id="m_st">${['active','paused','cancelled'].map(s=>`<option${sub?.status===s?' selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label>ราคา (฿)</label>
        <input id="m_cost" type="number" min="0" value="${sub?.cost||''}" placeholder="199"/></div>
      <div class="field"><label>รอบชำระ</label>
        <select id="m_cycle">${['monthly','yearly','weekly'].map(c=>`<option${sub?.cycle===c?' selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label>วันต่ออายุ</label>
        <input id="m_renew" type="date" value="${sub?.renew||nextDate(30)}"/></div>
      <div class="field"><label>วิธีชำระ</label>
        <input id="m_method" value="${sub?.method||''}" placeholder="Credit Card"/></div>
    </div>
    <div class="field"><label>หมายเหตุ</label>
      <input id="m_notes" value="${sub?.notes||''}" placeholder="..."/></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">ยกเลิก</button>
      ${isEdit ? `<button class="btn-del" onclick="confirmDelete('${sub.firestoreId}');closeModal()">ลบ</button>` : ''}
      <button class="btn-save" onclick="saveSub('${isEdit?sub.firestoreId:''}')">${isEdit?'บันทึก':'เพิ่ม'}</button>
    </div>`;
}

function closeModal() { document.getElementById('modalBg').classList.remove('open'); }

async function saveSub(firestoreId) {
  const name = document.getElementById('m_name').value.trim();
  if (!name) return;
  const data = {
    name, cat: document.getElementById('m_cat').value,
    cost:   parseFloat(document.getElementById('m_cost').value) || 0,
    cycle:  document.getElementById('m_cycle').value,
    status: document.getElementById('m_st').value,
    renew:  document.getElementById('m_renew').value,
    method: document.getElementById('m_method').value,
    notes:  document.getElementById('m_notes').value,
  };
  closeModal();
  if (firestoreId) await updateSub(firestoreId, data);
  else             await addSub(data);
}

function confirmDelete(id) {
  if (confirm('ลบ subscription นี้?')) deleteSub(id);
}

// ── EXPOSE GLOBALS (needed for inline onclick) ─────────────
window.openEdit      = openEdit;
window.confirmDelete = confirmDelete;
window.closeModal    = closeModal;
window.saveSub       = saveSub;

// ── EVENT LISTENERS ────────────────────────────────────────
document.getElementById('addBtn').addEventListener('click', openAdd);
document.getElementById('searchEl').addEventListener('input', render);
document.getElementById('modalBg').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBg')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── AUTH STATE OBSERVER ────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  renderAuthBar(user);
  if (user) {
    showAppScreen();
    startListener(user.uid);
  } else {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    subs = [];
    showLoginScreen();
  }
});
