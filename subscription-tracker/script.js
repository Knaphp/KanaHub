/* ── VARIABLES ── */
:root {
  --bg:      #0b0b0e;
  --surface: #13131a;
  --border:  rgba(255, 255, 255, 0.07);
  --text:    #edeae4;
  --muted:   rgba(237, 234, 228, 0.42);
  --accent:  #b8ff4f;
  --danger:  #ff6b6b;
}

/* ── RESET ── */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  padding: 2rem;
}

/* ── HEADER ── */
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.logo {
  font-size: clamp(20px, 3vw, 30px);
  font-weight: 700;
  letter-spacing: -0.03em;
}
.logo em {
  color: var(--accent);
  font-style: normal;
}
.logo-sub {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 4px;
}

.stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.stat { text-align: right; }
.stat-val {
  font-size: 20px;
  font-weight: 700;
}
.stat-label {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 2px;
}

/* ── TOOLBAR ── */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.toolbar input {
  flex: 1;
  min-width: 150px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 9px 14px;
  outline: none;
  transition: border-color 0.15s;
}
.toolbar input::placeholder { color: var(--muted); }
.toolbar input:focus { border-color: var(--accent); }

.btn-add {
  background: var(--accent);
  color: #0b0b0e;
  border: none;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 20px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-add:hover { opacity: 0.82; }

/* ── ALERT ── */
.alert-bar {
  background: rgba(184, 255, 79, 0.06);
  border: 1px solid rgba(184, 255, 79, 0.18);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--accent);
  margin-bottom: 1.25rem;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* ── CARDS GRID ── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 1000px) and (min-width: 701px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .cards-grid { grid-template-columns: 1fr; }
}

/* ── CARD ── */
.card {
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  position: relative;
  user-select: none;
  transition: transform 0.16s, filter 0.16s;
}
.card:hover {
  transform: translateY(-2px) scale(1.01);
  filter: brightness(1.07);
}
.card.dragging { opacity: 0.4; cursor: grabbing; }
.card.drag-over {
  outline: 2.5px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.card-icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.card-mid { flex: 1; min-width: 0; }
.card-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-date {
  font-size: 11px;
  opacity: 0.65;
  margin-top: 3px;
}

.card-right { text-align: right; flex-shrink: 0; }
.card-cost { font-size: 15px; font-weight: 700; }
.card-cycle { font-size: 11px; opacity: 0.6; margin-top: 2px; }

.card-badge {
  position: absolute;
  top: 8px; right: 8px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.22);
  letter-spacing: 0.05em;
}

.card-actions {
  position: absolute;
  bottom: 8px; right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.card:hover .card-actions { opacity: 1; }
.card-actions button {
  background: rgba(0, 0, 0, 0.35);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  padding: 3px 9px;
}
.card-actions button:hover { background: rgba(0, 0, 0, 0.6); }

.empty {
  text-align: center;
  padding: 4rem;
  color: var(--muted);
  font-size: 14px;
  grid-column: 1 / -1;
}

/* ── MODAL ── */
.modal-bg {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 200;
  align-items: center;
  justify-content: center;
}
.modal-bg.open { display: flex; }

.modal {
  background: #1c1c26;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.modal h2 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.field { margin-bottom: 13px; }
.field label {
  display: block;
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 5px;
}
.field input,
.field select {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
}
.field select option { background: #1c1c26; }
.field input:focus,
.field select:focus { border-color: var(--accent); }

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  color: var(--muted);
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 9px 16px;
  transition: color 0.15s;
}
.btn-cancel:hover { color: var(--text); }
.btn-save {
  background: var(--accent);
  border: none;
  border-radius: 9px;
  color: #0b0b0e;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 22px;
}
.btn-save:hover { opacity: 0.85; }
.btn-del {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 9px;
  color: var(--danger);
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 9px 16px;
}
.btn-del:hover { background: rgba(255, 107, 107, 0.22); }

/* ── FOOTER ── */
footer {
  text-align: center;
  font-size: 10px;
  color: var(--muted);
  opacity: 0.5;
  margin-top: 3rem;
}

/* ── LOGIN SCREEN ── */
#loginScreen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.login-box {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  max-width: 340px;
  width: 100%;
}
.login-box .logo { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 6px; }
.login-desc {
  font-size: 13px; color: var(--muted);
  margin: 1rem 0 1.75rem; line-height: 1.5;
}
.btn-login {
  background: #fff; color: #1a1a1a;
  border: none; border-radius: 10px;
  font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
  padding: 11px 22px; cursor: pointer;
  display: inline-flex; align-items: center;
  transition: opacity .15s;
}
.btn-login:hover { opacity: .88; }

/* ── AUTH BAR ── */
.header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
#authBar { display: flex; align-items: center; gap: 10px; }
.btn-logout {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px; color: var(--muted);
  cursor: pointer; font-family: 'Inter', sans-serif;
  font-size: 12px; padding: 5px 12px;
  transition: color .15s, border-color .15s;
}
.btn-logout:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
