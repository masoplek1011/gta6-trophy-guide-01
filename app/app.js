// Leonida Trophy Guide: loads the 55 trophies from data/trophies.json, renders the
// checklist with filters, a spoiler mode, and progress saved in localStorage.
// Everything runs offline; the only fetch is the local data file.

const EARNED_KEY = 'leonida-trophy-earned-v1';
const SPOILER_KEY = 'leonida-trophy-spoilers-v1';
const HIDE_EARNED_KEY = 'leonida-trophy-hide-earned-v1';

const listEl = document.getElementById('trophyList');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const hideEarnedEl = document.getElementById('hideEarnedToggle');
const kindChipsEl = document.getElementById('kindChips');
const resultCountEl = document.getElementById('resultCount');
const emptyEl = document.getElementById('emptyState');
const spoilerNoteEl = document.getElementById('spoilerNote');

const KINDS = [
  ['all', 'All 55'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['online', 'Online'],
  ['platinum', 'Platinum'],
];
const STAGE_LABELS = { 1: 'Stage 1 · During the story', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Clean-up' };

const params = new URLSearchParams(location.search);
let activeKind = KINDS.some(([k]) => k === params.get('kind')) ? params.get('kind') : 'all';
let openId = params.get('trophy') || null;

let trophies = [];
let earned = new Set(readStored(EARNED_KEY, []));
let spoilersOn = readStored(SPOILER_KEY, params.get('spoilers') === 'off' ? false : true);
let hideEarned = readStored(HIDE_EARNED_KEY, false);

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: progress just won't persist */ }
}

function saveEarned() { store(EARNED_KEY, [...earned]); }

function trophyHidden(t) { return spoilersOn && t.hidden && !earned.has(t.name); }

function visibleName(t) { return trophyHidden(t) ? 'Hidden story trophy' : t.name; }

function matchesFilters(t) {
  if (activeKind === 'online') return false;
  if (activeKind !== 'all' && t.kind !== activeKind) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (hideEarned && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind} ${STAGE_LABELS[t.stage] || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function tagHtml(t) {
  const tags = [];
  if (t.kind !== 'missable' && t.kind !== 'platinum') tags.push(`<span class="tag">${t.kind}</span>`);
  if (t.hidden) tags.push('<span class="tag hidden-tag">Hidden on PS5</span>');
  if (t.missable) tags.push('<span class="tag missable">Missable</span>');
  if (t.status === 'unconfirmed') tags.push('<span class="tag unconfirmed">Unconfirmed</span>');
  else if (t.status === 'partial') tags.push('<span class="tag unconfirmed">Partly unconfirmed</span>');
  return tags.join(' ');
}

function cardHtml(t) {
  const isEarned = earned.has(t.name);
  const hiddenNow = trophyHidden(t);
  const open = openId === t.id;
  const guideBody = hiddenNow
    ? '<p class="spoiler-hidden">Hidden until earned — tick it off to reveal the name, description and guide.</p>'
    : `<p class="desc">“${escapeHtml(t.description)}”</p>
       <p class="card-meta">${STAGE_LABELS[t.stage] || ''} &middot; ${t.hidden ? 'Hidden trophy' : 'Visible trophy'}</p>
       <div class="guide"${open ? '' : ' hidden'}>
         <p>${escapeHtml(t.guide)}</p>
         <p class="sources">Sources: ${t.sources.map((s) => `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`).join('')}</p>
       </div>`;
  return `<article class="card${isEarned ? ' earned' : ''}" data-id="${t.id}">
    <div class="card-head">
      <input type="checkbox" data-name="${escapeAttr(t.name)}" ${isEarned ? 'checked' : ''} aria-label="Mark ${escapeAttr(visibleName(t))} earned">
      <div class="card-main">
        <div class="card-title">
          <h3><button type="button" data-open="${t.id}">${escapeHtml(visibleName(t))}</button></h3>
          <span class="badge ${t.grade}">${t.grade}</span>
          ${tagHtml(t)}
        </div>
        ${guideBody}
      </div>
    </div>
  </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

function renderKindChips() {
  kindChipsEl.replaceChildren();
  for (const [kind, label] of KINDS) {
    const count = kind === 'all' ? trophies.length
      : kind === 'online' ? 0
      : trophies.filter((t) => t.kind === kind).length;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = `${label} (${count})`;
    chip.setAttribute('aria-pressed', String(activeKind === kind));
    chip.addEventListener('click', () => { activeKind = kind; render(); });
    kindChipsEl.append(chip);
  }
}

function renderProgress() {
  const n = earned.size;
  const total = trophies.length || 55;
  const pct = Math.round((n / total) * 100);
  document.getElementById('progressText').textContent = `${n} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}% to platinum`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  for (const stage of [1, 2, 3]) {
    const inStage = trophies.filter((t) => t.stage === stage);
    const done = inStage.filter((t) => earned.has(t.name)).length;
    const el = document.getElementById(`stageCount${stage}`);
    if (el) el.textContent = `${done} of ${inStage.length} trophies in this stage earned`;
  }
}

function render() {
  renderKindChips();
  renderProgress();
  spoilerEl.checked = spoilersOn;
  hideEarnedEl.checked = hideEarned;
  spoilerNoteEl.hidden = !spoilersOn;
  const shown = trophies.filter(matchesFilters);
  listEl.innerHTML = shown.map(cardHtml).join('');
  resultCountEl.textContent = activeKind === 'online'
    ? 'Online: none — all 55 trophies are single-player, so this filter is empty on purpose.'
    : `Showing ${shown.length} of ${trophies.length} trophies`;
  emptyEl.hidden = shown.length > 0;
}

function downloadProgress() {
  const payload = { app: 'leonida-trophy-guide', version: 1, exportedAt: new Date().toISOString(), earned: [...earned].sort() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveEarned();
    render();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
}

listEl.addEventListener('change', (event) => {
  const box = event.target.closest('input[type="checkbox"]');
  if (!box) return;
  if (box.checked) earned.add(box.dataset.name);
  else earned.delete(box.dataset.name);
  saveEarned();
  render();
});

listEl.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-open]');
  if (!btn) return;
  openId = openId === btn.dataset.open ? null : btn.dataset.open;
  render();
  const card = listEl.querySelector(`[data-id="${openId}"]`);
  if (card) card.scrollIntoView({ block: 'nearest' });
});

searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => { spoilersOn = spoilerEl.checked; store(SPOILER_KEY, spoilersOn); render(); });
hideEarnedEl.addEventListener('change', () => { hideEarned = hideEarnedEl.checked; store(HIDE_EARNED_KEY, hideEarned); render(); });
document.getElementById('exportBtn').addEventListener('click', downloadProgress);
document.getElementById('importInput').addEventListener('change', (e) => importProgress(e.target.files[0]));
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set();
  saveEarned();
  render();
});

const data = await (await fetch('data/trophies.json')).json();
trophies = data.trophies;
render();
if (openId && trophies.some((t) => t.id === openId)) {
  const card = listEl.querySelector(`[data-id="${openId}"]`);
  if (card) card.scrollIntoView({ block: 'center' });
}
