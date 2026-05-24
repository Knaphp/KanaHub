// ── CONSTANTS ──────────────────────────────────────────────
const CATS = [
  'Streaming', 'Music', 'Software', 'Gaming',
  'News', 'Fitness', 'Cloud', 'Shopping', 'Finance', 'Other'
];

const BG = {
  Streaming: '#5B6EE8',
  Music:     '#E8A838',
  Software:  '#6B9FE8',
  Gaming:    '#E85B8A',
  News:      '#7B8794',
  Fitness:   '#6BB86B',
  Cloud:     '#5BA8E8',
  Shopping:  '#E87B3B',
  Finance:   '#3BBFB8',
  Other:     '#8B7BE8',
};

// ── STATE ──────────────────────────────────────────────────
let subs = [];
let dragSrcId = null;

// ── UTILS ──────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function nextDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthCost(s) {
  if (s.status === 'cancelled') return 0;
  if (s.cycle === 'yearly')     return s.cost / 12;
  if (s.cycle === 'weekly')     return s.cost * 4.33;
  return s.cost;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now    = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function fmt(n) {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── STORAGE ────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem('kanahub_subs3');
    subs = raw ? JSON.parse(raw) : getSamples();
  } catch (e) {
    subs = getSamples();
  }
  render();
}

function save() {
  try {
    localStorage.setItem('kanahub_subs3', JSON.stringify(subs));
  } catch (e) {}
}

function getSamples() {
  return [
    { id: uid(), name: 'Adobe CC',        cat: 'Software',  cost: 1690, cycle: 'monthly', status: 'active', renew: nextDate(3),  method: 'Credit Card', notes: '', order: 0 },
    { id: uid(), name: 'ChatGPT Plus',    cat: 'Software',  cost: 680,  cycle: 'monthly', status: 'active', renew: nextDate(25), method: 'Credit Card', notes: '', order: 1 },
    { id: uid(), name: 'Figma Pro',       cat: 'Software',  cost: 560,  cycle: 'monthly', status: 'active', renew: nextDate(8),  method: 'Credit Card', notes: '', order: 2 },
    { id: uid(), name: 'Netflix',         cat: 'Streaming', cost: 419,  cycle: 'monthly', status: 'active', renew: nextDate(12), method: 'Credit Card', notes: '', order: 3 },
    { id: uid(), name: 'YouTube Premium', cat: 'Streaming', cost: 189,  cycle: 'monthly', status: 'active', renew: nextDate(18), method: 'Credit Card', notes: '', order: 4 },
    { id: uid(), name: 'Spotify',         cat: 'Music',     cost: 129,  cycle: 'monthly', status: 'active', renew: nextDate(5),  method: 'Credit Card', notes: '', order: 5 },
    { id: uid(), name: 'iCloud 200GB',    cat: 'Cloud',     cost: 35,   cycle: 'monthly', status: 'active', renew: nextDate(22), method: 'Credit Card', notes: '', order: 6 },
  ];
}

// ── DRAG & DROP ────────────────────────────────────────────
function onDragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => {
    document.querySelector(`[data-id="${id}"]`)?.classList.add('dragging');
  }, 0);
}

function onDragEnd() {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('dragging', 'drag-over'));
  dragSrcId = null;
}

function onDragOver(e, id) {
  e.preventDefault();
  document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
  if (id !== dragSrcId) {
    document.querySelector(`[data-id="${id}"]`)?.classList.add('drag-over');
  }
}

function onDrop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
  if (!dragSrcId || dragSrcId === targetId) return;

  const si = subs.findIndex(s => s.id === dragSrcId);
  const ti = subs.findIndex(s => s.id === targetId);
  if (si < 0 || ti < 0) return;

  const [moved] = subs.splice(si, 1);
  subs.splice(ti, 0, moved);
  subs.forEach((s, i) => s.order = i);
  save();
  render();
}

// ── RENDER ─────────────────────────────────────────────────
function render() {
  const query = document.getElementById('searchEl').value.toLowerCase();
  const list  = subs.filter(s =>
    !query ||
    s.name.toLowerCase().includes(query) ||
    s.cat.toLowerCase().includes(query)
  );

  // update stats
  const active  = subs.filter(s => s.status === 'active');
  const monthly = active.reduce((sum, s) => sum + monthCost(s), 0);
  document.getElementById('statMonthly').textContent = fmt(monthly);
  document.getElementById('statYearly').textContent  = fmt(monthly * 12);
  document.getElementById('statCount').textContent   = active.length;

  // renewal alerts
  const soon = subs.filter(s =>
    s.status === 'active' &&
    daysUntil(s.renew) <= 3 &&
    daysUntil(s.renew) >= 0
  );
  document.getElementById('alertEl').innerHTML = soon.length
    ? `<div class="alert-bar">⚡ ต่ออายุเร็วๆ นี้: ${soon.map(s => `<b>${s.name}</b> (${daysUntil(s.renew)} วัน)`).join(' · ')}</div>`
    : '';

  // build cards
  const grid = document.getElementById('gridEl');
  if (!list.length) {
    grid.innerHTML = '<div class="empty">ยังไม่มี subscription</div>';
    return;
  }

  grid.innerHTML = '';
  list.forEach(s => {
    const days     = daysUntil(s.renew);
    const isActive = s.status === 'active';
    const isPaused = s.status === 'paused';
    const bg       = BG[s.cat] || '#6B7280';
    const initials = s.name.slice(0, 2).toUpperCase();
    const cycleLabel = s.cycle === 'monthly' ? 'Per month' :
                       s.cycle === 'yearly'  ? 'Per year'  : 'Per week';

    let badgeText = '';
    if      (isPaused)           badgeText = 'paused';
    else if (s.status === 'cancelled') badgeText = 'cancelled';
    else if (days < 0)           badgeText = 'expired';
    else if (days === 0)         badgeText = 'today!';
    else if (days <= 3)          badgeText = `${days}d!`;

    const badgeColor = (days <= 3 && isActive) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';

    const card = document.createElement('div');
    card.className  = 'card';
    card.dataset.id = s.id;
    card.draggable  = true;
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
        <button onclick="openEdit('${s.id}'); event.stopPropagation()">แก้ไข</button>
        <button onclick="deleteSub('${s.id}'); event.stopPropagation()">ลบ</button>
      </div>
    `;

    card.addEventListener('dragstart', e => onDragStart(e, s.id));
    card.addEventListener('dragend',   onDragEnd);
    card.addEventListener('dragover',  e => onDragOver(e, s.id));
    card.addEventListener('drop',      e => onDrop(e, s.id));
    card.addEventListener('click',     () => openEdit(s.id));

    grid.appendChild(card);
  });
}

// ── MODAL ──────────────────────────────────────────────────
function openAdd()    { showModal(null); }
function openEdit(id) { showModal(subs.find(s => s.id === id)); }

function showModal(sub) {
  const isEdit = !!sub;
  document.getElementById('modalBg').classList.add('open');
  document.getElementById('modalEl').innerHTML = `
    <h2>${isEdit ? 'แก้ไข' : 'เพิ่ม'} subscription</h2>

    <div class="field">
      <label>ชื่อ</label>
      <input id="m_name" value="${sub ? sub.name : ''}" placeholder="เช่น Netflix" autofocus/>
    </div>

    <div class="row2">
      <div class="field">
        <label>Category</label>
        <select id="m_cat">
          ${CATS.map(c => `<option${sub && sub.cat === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Status</label>
        <select id="m_st">
          ${['active', 'paused', 'cancelled'].map(s => `<option${sub && sub.status === s ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="row2">
      <div class="field">
        <label>ราคา (฿)</label>
        <input id="m_cost" type="number" min="0" value="${sub ? sub.cost : ''}" placeholder="199"/>
      </div>
      <div class="field">
        <label>รอบชำระ</label>
        <select id="m_cycle">
          ${['monthly', 'yearly', 'weekly'].map(c => `<option${sub && sub.cycle === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="row2">
      <div class="field">
        <label>วันต่ออายุ</label>
        <input id="m_renew" type="date" value="${sub ? sub.renew : nextDate(30)}"/>
      </div>
      <div class="field">
        <label>วิธีชำระ</label>
        <input id="m_method" value="${sub ? sub.method : ''}" placeholder="Credit Card"/>
      </div>
    </div>

    <div class="field">
      <label>หมายเหตุ</label>
      <input id="m_notes" value="${sub ? sub.notes : ''}" placeholder="..."/>
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">ยกเลิก</button>
      ${isEdit ? `<button class="btn-del" onclick="deleteSub('${sub.id}'); closeModal()">ลบ</button>` : ''}
      <button class="btn-save" onclick="saveSub('${isEdit ? sub.id : ''}')">${isEdit ? 'บันทึก' : 'เพิ่ม'}</button>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open');
}

// ── CRUD ───────────────────────────────────────────────────
function saveSub(id) {
  const name = document.getElementById('m_name').value.trim();
  if (!name) return;

  const obj = {
    id:     id || uid(),
    name,
    cat:    document.getElementById('m_cat').value,
    cost:   parseFloat(document.getElementById('m_cost').value) || 0,
    cycle:  document.getElementById('m_cycle').value,
    status: document.getElementById('m_st').value,
    renew:  document.getElementById('m_renew').value,
    method: document.getElementById('m_method').value,
    notes:  document.getElementById('m_notes').value,
    order:  id ? (subs.find(s => s.id === id)?.order ?? subs.length) : subs.length,
  };

  if (id) {
    const idx = subs.findIndex(s => s.id === id);
    if (idx > -1) subs[idx] = obj;
  } else {
    subs.push(obj);
  }

  save();
  closeModal();
  render();
}

function deleteSub(id) {
  subs = subs.filter(s => s.id !== id);
  save();
  render();
}

// ── EVENT LISTENERS ────────────────────────────────────────
document.getElementById('addBtn').addEventListener('click', openAdd);
document.getElementById('searchEl').addEventListener('input', render);
document.getElementById('modalBg').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBg')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── INIT ───────────────────────────────────────────────────
load();
