// ── FIREBASE ───────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app  = initializeApp({
  apiKey:"AIzaSyDBOuyfHre1_CE3dWCkJuo7LLfiaFcBiys",
  authDomain:"kanahub-a4f9a.firebaseapp.com",
  projectId:"kanahub-a4f9a",
  storageBucket:"kanahub-a4f9a.firebasestorage.app",
  messagingSenderId:"587364108316",
  appId:"1:587364108316:web:21d46aba7b8382767977d9",
});
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── CONSTANTS ──────────────────────────────────────────────
const CATS = ['Streaming','Music','Software','Gaming','News','Fitness','Cloud','Shopping','Finance','Other'];

// ── STATE ──────────────────────────────────────────────────
let subs        = [];
let currentUser = null;
let unsubscribe = null;
let dragSrcId   = null;
let pendingIcon = null;

// ── UTILS ──────────────────────────────────────────────────
function nextDate(d){ const dt=new Date(); dt.setDate(dt.getDate()+d); return dt.toISOString().slice(0,10); }
function monthCost(s){ if(s.status==='cancelled')return 0; if(s.cycle==='yearly')return s.cost/12; if(s.cycle==='weekly')return s.cost*4.33; return s.cost; }
function daysUntil(ds){ const t=new Date(ds),n=new Date(); n.setHours(0,0,0,0);t.setHours(0,0,0,0); return Math.round((t-n)/86400000); }
function fmt(n){ return '฿'+Math.round(n).toLocaleString('th-TH'); }
function fmtDate(ds){ const d=new Date(ds); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`; }
function showStatus(msg,err=false){ const el=document.getElementById('statusEl'); el.textContent=msg; el.style.color=err?'#ef4444':'#3dba8f'; el.style.opacity='1'; setTimeout(()=>el.style.opacity='0',2500); }

// ── PASTE IMAGE helper ─────────────────────────────────────
function extractImageFromClipboard(items) {
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}
function fileToBase64(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });
}

// ── TOPBAR ─────────────────────────────────────────────────
function renderTopbar(user){
  const info=document.getElementById('userInfo');
  const act=document.getElementById('authAction');
  if(user){
    info.innerHTML=`<img class="user-avatar" src="${user.photoURL}"/><span class="user-name">${user.displayName}</span>`;
    act.innerHTML=`<button class="btn-logout" id="logoutBtn">Logout</button>`;
    document.getElementById('logoutBtn').addEventListener('click',()=>signOut(auth));
  } else {
    info.innerHTML=`<div class="user-avatar-placeholder">👤</div><span class="user-name" style="color:#9ca3af">ยังไม่ได้ login</span>`;
    act.innerHTML='';
  }
}

// ── FIRESTORE ──────────────────────────────────────────────
function col(uid){ return collection(db,'users',uid,'subscriptions'); }

function startListener(uid){
  if(unsubscribe) unsubscribe();
  const q=query(col(uid),orderBy('order','asc'));
  unsubscribe=onSnapshot(q,snap=>{
    subs=snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
    render();
  },err=>{ console.error(err); showStatus('Firebase error',true); });
}

async function addSub(data){ try{ data.order=subs.length; await addDoc(col(currentUser.uid),data); showStatus('เพิ่มแล้ว ✓'); }catch(e){ showStatus(e.message,true); } }
async function updateSub(fid,data){ try{ await updateDoc(doc(db,'users',currentUser.uid,'subscriptions',fid),data); showStatus('บันทึกแล้ว ✓'); }catch(e){ showStatus(e.message,true); } }
async function deleteSub(fid){ try{ await deleteDoc(doc(db,'users',currentUser.uid,'subscriptions',fid)); showStatus('ลบแล้ว ✓'); }catch(e){ showStatus(e.message,true); } }

// ── DRAG & DROP ────────────────────────────────────────────
function onDragStart(e,id){ dragSrcId=id; e.dataTransfer.effectAllowed='move'; setTimeout(()=>document.querySelector(`[data-id="${id}"]`)?.classList.add('dragging'),0); }
function onDragEnd(){ document.querySelectorAll('.card').forEach(c=>c.classList.remove('dragging','drag-over')); dragSrcId=null; }
function onDragOver(e,id){ e.preventDefault(); document.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-over')); if(id!==dragSrcId) document.querySelector(`[data-id="${id}"]`)?.classList.add('drag-over'); }
async function onDrop(e,tid){
  e.preventDefault(); document.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-over'));
  if(!dragSrcId||dragSrcId===tid) return;
  const si=subs.findIndex(s=>s.firestoreId===dragSrcId),ti=subs.findIndex(s=>s.firestoreId===tid);
  if(si<0||ti<0) return;
  const r=[...subs]; const[m]=r.splice(si,1); r.splice(ti,0,m);
  await Promise.all(r.map((s,i)=>updateDoc(doc(db,'users',currentUser.uid,'subscriptions',s.firestoreId),{order:i})));
}

// ── ICON PASTE on card ─────────────────────────────────────
function setupIconPaste(wrapEl, fid) {
  // highlight on focus so user knows to paste here
  wrapEl.addEventListener('click', e=>{ e.stopPropagation(); wrapEl.focus(); });
  wrapEl.setAttribute('tabindex','0');
  wrapEl.addEventListener('keydown', async e=>{
    if((e.ctrlKey||e.metaKey) && e.key==='v'){
      e.preventDefault();
      try {
        const items = await navigator.clipboard.read();
        for(const item of items){
          const imgType = item.types.find(t=>t.startsWith('image/'));
          if(imgType){
            const blob = await item.getType(imgType);
            const b64  = await fileToBase64(blob);
            await updateSub(fid, {...subs.find(s=>s.firestoreId===fid), icon:b64});
            return;
          }
        }
      } catch(err){ showStatus('ไม่สามารถ paste รูปได้',true); }
    }
  });
}

// ── RENDER ─────────────────────────────────────────────────
function render(){
  const q=document.getElementById('searchEl').value.toLowerCase();
  const list=subs.filter(s=>!q||s.name.toLowerCase().includes(q)||s.cat?.toLowerCase().includes(q));

  const active=subs.filter(s=>s.status==='active');
  const monthly=active.reduce((a,s)=>a+monthCost(s),0);
  document.getElementById('statMonthly').textContent=fmt(monthly);
  document.getElementById('statYearly').textContent=fmt(monthly*12);
  document.getElementById('statCount').textContent=active.length;

  const soon=subs.filter(s=>s.status==='active'&&daysUntil(s.renew)<=3&&daysUntil(s.renew)>=0);
  document.getElementById('alertEl').innerHTML=soon.length
    ?`<div class="alert-bar">⚡ ต่ออายุเร็วๆ นี้: ${soon.map(s=>`<b>${s.name}</b> (${daysUntil(s.renew)} วัน)`).join(' · ')}</div>`:'';

  const grid=document.getElementById('gridEl');
  if(!list.length){ grid.innerHTML='<div class="empty">ยังไม่มี subscription — กด + เพิ่ม</div>'; return; }

  grid.innerHTML='';
  list.forEach(s=>{
    const days=daysUntil(s.renew);
    const isActive=s.status==='active';
    const isPaused=s.status==='paused';
    const cyc=s.cycle==='monthly'?'month':s.cycle==='yearly'?'year':'week';
    const initials=s.name.slice(0,2).toUpperCase();
    const iconHtml=s.icon
      ?`<img class="card-icon-img" src="${s.icon}" alt="${s.name}"/>`
      :`<span class="card-icon-text">${initials}</span>`;

    let badgeHtml='';
    if(isPaused)              badgeHtml=`<span class="card-badge badge-paused">paused</span>`;
    else if(s.status==='cancelled') badgeHtml=`<span class="card-badge badge-cancelled">cancelled</span>`;
    else if(days<=3&&days>=0) badgeHtml=`<span class="card-badge badge-soon">${days===0?'today!':days+'d'}</span>`;

    let renewTxt='';
    if(days<0)       renewTxt=`<span class="card-renew" style="color:#ef4444">หมดอายุแล้ว</span>`;
    else if(days<=3) renewTxt=`<span class="card-renew soon">ต่ออายุใน ${days} วัน</span>`;
    else             renewTxt=`<span class="card-renew">${fmtDate(s.renew)}</span>`;

    const card=document.createElement('div');
    card.className='card'; card.dataset.id=s.firestoreId; card.draggable=true;
    card.style.opacity=(isPaused||s.status==='cancelled')?'0.6':'1';
    card.innerHTML=`
      <div class="card-top">
        <div class="card-icon-wrap" id="iconWrap_${s.firestoreId}" title="คลิกแล้ว Ctrl+V วางรูป">${iconHtml}</div>
        <div class="card-mid">
          <div class="card-name">${s.name}</div>
          <div class="card-cat">${s.cat||''}</div>
        </div>
        <div class="card-right">
          <div class="card-cost">${fmt(s.cost)}</div>
          <div class="card-cycle">${cyc}</div>
        </div>
      </div>
      ${s.notes?`<div class="card-notes">${s.notes}</div>`:''}
      <div class="card-bottom">
        ${renewTxt}
        <div style="display:flex;align-items:center;gap:8px">
          ${badgeHtml}
          <div class="card-actions">
            <button class="btn-edit">Edit</button>
            <button class="btn-delete">Delete</button>
          </div>
        </div>
      </div>`;

    // paste icon on card
    const wrap=card.querySelector(`#iconWrap_${s.firestoreId}`);
    setupIconPaste(wrap, s.firestoreId);

    // drag
    card.addEventListener('dragstart',e=>onDragStart(e,s.firestoreId));
    card.addEventListener('dragend',onDragEnd);
    card.addEventListener('dragover',e=>onDragOver(e,s.firestoreId));
    card.addEventListener('drop',e=>onDrop(e,s.firestoreId));

    // buttons
    card.querySelector('.btn-edit').addEventListener('click',e=>{ e.stopPropagation(); openEdit(s.firestoreId); });
    card.querySelector('.btn-delete').addEventListener('click',e=>{ e.stopPropagation(); if(confirm('ลบ?')) deleteSub(s.firestoreId); });
    card.addEventListener('click',()=>openEdit(s.firestoreId));

    grid.appendChild(card);
  });
}

// ── MODAL ──────────────────────────────────────────────────
function openAdd(){ pendingIcon=null; showModal(null); }
function openEdit(id){ pendingIcon=null; showModal(subs.find(s=>s.firestoreId===id)); }

function showModal(sub){
  const isEdit=!!sub;
  const initials=sub?sub.name.slice(0,2).toUpperCase():'??';
  pendingIcon=sub?.icon||null;

  document.getElementById('modalBg').classList.add('open');
  document.getElementById('modalEl').innerHTML=`
    <h2>${isEdit?'แก้ไข':'เพิ่ม'} subscription</h2>

    <div class="icon-preview-wrap">
      <div class="icon-preview" id="modalIconPreview" tabindex="0" title="คลิกแล้ว Ctrl+V / Cmd+V วางรูป">
        ${pendingIcon
          ?`<img src="${pendingIcon}" style="width:100%;height:100%;object-fit:cover;border-radius:12px"/>`
          :`<span class="icon-preview-text" id="modalIconTxt">${initials}</span>`}
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:4px">ไอคอน</div>
        <div class="icon-hint">คลิกที่กล่อง → กด Ctrl+V (หรือ Cmd+V)<br>เพื่อ paste รูปจาก clipboard</div>
      </div>
    </div>

    <div class="field"><label>ชื่อ</label>
      <input id="m_name" value="${sub?.name||''}" placeholder="เช่น Netflix" autofocus/></div>
    <div class="row2">
      <div class="field"><label>Category</label>
        <select id="m_cat">${CATS.map(c=>`<option${sub?.cat===c?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label>
        <select id="m_st">${['active','paused','cancelled'].map(v=>`<option${sub?.status===v?' selected':''}>${v}</option>`).join('')}</select></div>
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
      <textarea id="m_notes">${sub?.notes||''}</textarea></div>
    <div class="modal-actions">
      <button class="btn-m-cancel" id="mCancel">ยกเลิก</button>
      ${isEdit?`<button class="btn-m-del" id="mDel">ลบ</button>`:''}
      <button class="btn-m-save" id="mSave">${isEdit?'บันทึก':'เพิ่ม'}</button>
    </div>`;

  // paste in modal icon box
  const prev=document.getElementById('modalIconPreview');
  prev.addEventListener('click',()=>prev.focus());
  prev.addEventListener('keydown', async e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='v'){
      e.preventDefault();
      try {
        const items=await navigator.clipboard.read();
        for(const item of items){
          const imgType=item.types.find(t=>t.startsWith('image/'));
          if(imgType){
            const blob=await item.getType(imgType);
            pendingIcon=await fileToBase64(blob);
            prev.innerHTML=`<img src="${pendingIcon}" style="width:100%;height:100%;object-fit:cover;border-radius:12px"/>`;
            return;
          }
        }
      } catch(err){ showStatus('ไม่สามารถ paste รูปได้',true); }
    }
  });

  // update initials when typing name (no icon yet)
  document.getElementById('m_name').addEventListener('input',e=>{
    if(!pendingIcon){
      const txt=document.getElementById('modalIconTxt');
      if(txt) txt.textContent=e.target.value.slice(0,2).toUpperCase()||'??';
    }
  });

  document.getElementById('mCancel').addEventListener('click',closeModal);
  document.getElementById('mSave').addEventListener('click',()=>saveSub(sub?.firestoreId||''));
  if(isEdit) document.getElementById('mDel').addEventListener('click',()=>{ if(confirm('ลบ?')){ deleteSub(sub.firestoreId); closeModal(); } });
}

function closeModal(){ document.getElementById('modalBg').classList.remove('open'); }

async function saveSub(fid){
  const name=document.getElementById('m_name').value.trim();
  if(!name) return;
  const data={
    name, icon:pendingIcon||null,
    cat:document.getElementById('m_cat').value,
    cost:parseFloat(document.getElementById('m_cost').value)||0,
    cycle:document.getElementById('m_cycle').value,
    status:document.getElementById('m_st').value,
    renew:document.getElementById('m_renew').value,
    method:document.getElementById('m_method').value,
    notes:document.getElementById('m_notes').value,
  };
  closeModal();
  if(fid) await updateSub(fid,data);
  else    await addSub(data);
}

// ── EVENTS ─────────────────────────────────────────────────
document.getElementById('addBtn').addEventListener('click',openAdd);
document.getElementById('searchEl').addEventListener('input',render);
document.getElementById('modalBg').addEventListener('click',e=>{ if(e.target===document.getElementById('modalBg')) closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
document.getElementById('loginBtn2')?.addEventListener('click',()=>signInWithPopup(auth,provider));

// ── AUTH ───────────────────────────────────────────────────
onAuthStateChanged(auth,user=>{
  currentUser=user;
  renderTopbar(user);
  if(user){
    document.getElementById('appContent').style.display='block';
    document.getElementById('loginScreen').style.display='none';
    startListener(user.uid);
  } else {
    if(unsubscribe){ unsubscribe(); unsubscribe=null; }
    subs=[];
    document.getElementById('appContent').style.display='none';
    document.getElementById('loginScreen').style.display='flex';
  }
});
