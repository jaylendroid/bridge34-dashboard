const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

const ASSIGNEE_DISPLAY = {
  'Jaylen_77': 'Jaylen',
  'Benbenbennnn': 'Ben',
  'sylviechoi': 'Sylvie',
  'lenaeo25': 'Lena',
  'fireantico': '불개미',
  'Stanley_UJ': 'Stanley',
};

function sbHeaders(preferReturn = false) {
  return {
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(preferReturn ? { Prefer: 'return=representation' } : {})
  };
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: sbHeaders(true),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: sbHeaders(true),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function sbDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: sbHeaders(true)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSeoulDate(now = new Date()) {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function getSeoulClock(now = new Date()) {
  const kst = getSeoulDate(now);
  const hh = String(kst.getHours()).padStart(2, '0');
  const mi = String(kst.getMinutes()).padStart(2, '0');
  const ss = String(kst.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

function kstDateRange(offsetDays = 0) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  const start = kst.toISOString().slice(0, 19);
  kst.setUTCDate(kst.getUTCDate() + 1);
  const end = kst.toISOString().slice(0, 19);
  return { start, end };
}

function updateClock() {
  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.textContent = `${getSeoulClock()} KST  ↻ 30s`;
  }
}

function updateScheduleTitles() {
  const kstNow = getSeoulDate();
  const todayTitle = document.getElementById('todayTitle');
  const tomorrowTitle = document.getElementById('tomorrowTitle');

  const mm = kstNow.getMonth() + 1;
  const dd = kstNow.getDate();
  const tomorrow = new Date(kstNow);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (todayTitle) todayTitle.textContent = `📅 오늘 (${mm}/${dd})`;
  if (tomorrowTitle) tomorrowTitle.textContent = `📅 내일 (${tomorrow.getMonth() + 1}/${tomorrow.getDate()})`;
}

async function loadAll() {
  const todayRange = kstDateRange(0);
  const tomorrowRange = kstDateRange(1);

  const [projects, deals, tasks, todayEvents, tomorrowEvents] = await Promise.all([
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EC%A7%84%ED%96%89%EC%A4%91&order=created_at.asc'),
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EB%85%BC%EC%9D%98%EC%A4%91&order=client.asc'),
    sbGet('tasks?select=id,task,assignee,status,due_date&status=neq.Done&order=created_at.asc'),
    sbGet(`events?select=id,start_time,summary&start_time=gte.${todayRange.start}&start_time=lt.${todayRange.end}&order=start_time.asc`),
    sbGet(`events?select=id,start_time,summary&start_time=gte.${tomorrowRange.start}&start_time=lt.${tomorrowRange.end}&order=start_time.asc`)
  ]);

  renderProjects(projects);
  renderDeals(deals);
  renderTodos(tasks);
  renderSchedule(todayEvents, 'todayList');
  renderSchedule(tomorrowEvents, 'tomorrowList');
}

// 6명 고정 순서 (3열 2행)
const ALL_MEMBERS = ['Jaylen', 'Ben', 'Sylvie', 'Lena', '불개미', 'Stanley'];

function renderTodos(tasks) {
  const wrap = document.getElementById('todoGroups');
  if (!wrap) return;
  // 담당자별 그룹핑
  const grouped = {};
  for (const t of tasks || []) {
    const raw = t.assignee || 'Unassigned';
    const a = ASSIGNEE_DISPLAY[raw] || raw;
    const slot = ALL_MEMBERS.includes(a) ? a : null;
    if (!slot) continue;
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(t);
  }
  const MAX_SHOW = 10;
  // 6명 슬롯 고정 순서로 렌더링
  wrap.innerHTML = ALL_MEMBERS.map(name => {
    const arr = grouped[name] || [];
    const visible = arr.slice(0, MAX_SHOW);
    const extra = arr.length - MAX_SHOW;
    const items = visible.map(t => `
      <div class="todo-item">
        <span class="todo-bullet">•</span>
        <span>${esc(t.task||'-')}</span>
      </div>`).join('');
    const emptyMsg = arr.length === 0 ? '<div class="todo-more">할일 없음 ✓</div>' : '';
    return `<div class="todo-group">
      <div class="todo-head">
        <span class="todo-name">👤 ${esc(name)}</span>
        <span class="todo-rate">${arr.length}건</span>
      </div>
      ${items}${emptyMsg}
    </div>`;
  }).join('');
}



function renderProjects(rows) {
  const body = document.getElementById('projectsBody');
  if (!body) return;

  if (!rows?.length) {
    body.innerHTML = '<tr><td colspan="4">진행중 프로젝트가 없습니다.</td></tr>';
    return;
  }

  body.innerHTML = rows.map((row) => `
    <tr data-id="${row.id}">
      <td class="editable-cell" data-field="client">${esc(row.client || '')}</td>
      <td class="editable-cell" data-field="next_action">${esc(row.next_action || '')}</td>
      <td class="editable-cell" data-field="notes">${esc(row.notes || '')}</td>
      <td><button class="delete-btn" data-action="delete" aria-label="삭제">🗑</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('td.editable-cell').forEach((cell) => {
    cell.addEventListener('click', () => activateInlineEditor(cell));
  });

  body.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tr = btn.closest('tr');
      if (!tr?.dataset.id) return;
      btn.disabled = true;
      try {
        await sbDelete(`clients?id=eq.${tr.dataset.id}`);
        tr.remove();
        if (!body.querySelector('tr')) {
          body.innerHTML = '<tr><td colspan="4">진행중 프로젝트가 없습니다.</td></tr>';
        }
      } catch (err) {
        console.error('행 삭제 실패:', err);
        btn.disabled = false;
      }
    });
  });
}

function activateInlineEditor(cell) {
  if (!cell || cell.querySelector('.inline-editor')) return;

  const field = cell.dataset.field;
  const tr = cell.closest('tr');
  const id = tr?.dataset.id;
  if (!field || !id) return;

  const original = cell.textContent ?? '';
  const editor = document.createElement('input');
  editor.className = 'inline-editor';
  editor.type = 'text';
  editor.value = original;

  cell.textContent = '';
  cell.appendChild(editor);
  editor.focus();
  editor.select();

  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;

    const nextValue = (editor.value || '').trim();

    if (!save) {
      cell.textContent = original;
      return;
    }

    try {
      await sbPatch(`clients?id=eq.${id}`, {
        [field]: nextValue,
        updated_at: new Date().toISOString()
      });
      cell.textContent = nextValue;
    } catch (err) {
      console.error('인라인 저장 실패:', err);
      cell.textContent = original;
    }
  };

  editor.addEventListener('blur', () => finish(true));
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
}

function bindProjectAddButton() {
  const addBtn = document.getElementById('addProjectBtn');
  if (!addBtn || addBtn.dataset.bound === '1') return;

  addBtn.dataset.bound = '1';
  addBtn.addEventListener('click', async () => {
    addBtn.disabled = true;
    try {
      await sbPost('clients', {
        client: '새 프로젝트',
        next_action: '',
        notes: '',
        category: '진행중'
      });
      await loadAll();
      // 마지막 행 첫 번째 셀 자동 포커스
      const body = document.getElementById('projectsBody');
      const lastRow = body?.querySelector('tr:last-child');
      const firstCell = lastRow?.querySelector('td.editable-cell');
      if (firstCell) {
        firstCell.scrollIntoView({ block: 'nearest' });
        activateInlineEditor(firstCell);
      }
    } catch (err) {
      console.error('프로젝트 추가 실패:', err);
    } finally {
      addBtn.disabled = false;
    }
  });
}

function renderDeals(rows) {
  const wrap = document.getElementById('dealList');
  const badge = document.getElementById('dealCountBadge');
  if (!wrap || !badge) return;

  const list = rows || [];
  badge.textContent = String(list.length);

  if (!list.length) {
    wrap.innerHTML = '<div class="empty">미확정 딜 없음</div>';
    return;
  }

  wrap.innerHTML = list.map((r) => `
    <article class="deal-card" data-id="${r.id}">
      <span class="deal-card-name">${esc(r.client || '-')}</span>
      <button class="deal-delete-btn" data-action="delete" title="삭제">🗑</button>
    </article>
  `).join('');

  // 이름 클릭 → 인라인 편집
  wrap.querySelectorAll('.deal-card').forEach((card) => {
    const nameSpan = card.querySelector('.deal-card-name');
    nameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      if (card.querySelector('.deal-inline-input')) return;
      const id = card.dataset.id;
      const original = nameSpan.textContent;
      const input = document.createElement('input');
      input.className = 'deal-inline-input';
      input.value = original;
      input.style.cssText = 'width:100%;background:#111;color:#e0e0f0;border:1px solid #555;border-radius:3px;font-size:0.72rem;padding:1px 3px;';
      nameSpan.textContent = '';
      nameSpan.appendChild(input);
      input.focus(); input.select();
      let saved = false;
      const save = async () => {
        if (saved) return; saved = true;
        const val = (input.value || '').trim();
        if (val && val !== original) {
          try {
            await sbPatch(`clients?id=eq.${id}`, { client: val, updated_at: new Date().toISOString() });
            nameSpan.textContent = val;
          } catch { nameSpan.textContent = original; }
        } else { nameSpan.textContent = original || val; }
      };
      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { saved = true; nameSpan.textContent = original; }
      });
    });
  });

  // 삭제 버튼
  wrap.querySelectorAll('.deal-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = btn.closest('.deal-card');
      if (!card?.dataset.id) return;
      btn.disabled = true;
      try {
        await sbDelete(`clients?id=eq.${card.dataset.id}`);
        card.remove();
        const remaining = wrap.querySelectorAll('.deal-card').length;
        badge.textContent = String(remaining);
        if (!remaining) wrap.innerHTML = '<div class="empty">미확정 딜 없음</div>';
      } catch { btn.disabled = false; }
    });
  });
}

function bindDealAddButton() {
  const btn = document.getElementById('addDealBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const name = prompt('딜 이름을 입력하세요');
    if (!name?.trim()) return;
    try {
      await sbPost('clients', { client: name.trim(), category: '논의중' });
      loadAll();
    } catch (e) { alert('추가 실패: ' + e.message); }
  });
}

function renderSchedule(events, panelId) {
  const wrap = document.getElementById(panelId);
  if (!wrap) return;
  if (!events || !events.length) {
    wrap.innerHTML = '<div class="empty">일정 없음</div>';
    return;
  }

  wrap.innerHTML = events.map((ev) => {
    const t = ev.start_time ? ev.start_time.slice(11, 16) : '--:--';
    return `<div class="schedule-item"><span class="sch-time">${t}</span><span class="sch-title">${esc(ev.summary || '-')}</span></div>`;
  }).join('');
}



updateClock();
updateScheduleTitles();
bindProjectAddButton();
bindDealAddButton();
loadAll().catch((e) => console.error('초기 로드 실패:', e));
setInterval(updateClock, 1000);
setInterval(() => {
  updateScheduleTitles();
  loadAll().catch((e) => console.error('주기 로드 실패:', e));
}, 30000);

// ─────────────────────────────────────────
// Client Map 사이드패널
// ─────────────────────────────────────────

let cpCurrentClient = null;
let cpCurrentTab = 'meetings';

function openClientPanel(clientName) {
  cpCurrentClient = clientName;
  document.getElementById('cpClientName').textContent = clientName;
  document.getElementById('clientPanel').classList.add('open');
  document.getElementById('cpOverlay').classList.add('open');
  switchCpTab('meetings');
}

function closeClientPanel() {
  document.getElementById('clientPanel').classList.remove('open');
  document.getElementById('cpOverlay').classList.remove('open');
  cpCurrentClient = null;
  hideCpForm('meeting');
  hideCpForm('contact');
  hideCpForm('deal');
}

function switchCpTab(tab) {
  cpCurrentTab = tab;
  document.querySelectorAll('.cp-tab').forEach((t, i) => {
    const tabs = ['meetings', 'contacts', 'deals'];
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.cp-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`cp-${tab}`).classList.add('active');

  if (!cpCurrentClient) return;
  if (tab === 'meetings') loadCpMeetings(cpCurrentClient);
  if (tab === 'contacts') loadCpContacts(cpCurrentClient);
  if (tab === 'deals') loadCpDeals(cpCurrentClient);
}

function showCpForm(type) {
  const formId = { meeting: 'meetingForm', contact: 'contactForm', deal: 'dealForm' }[type];
  document.getElementById(formId).style.display = 'block';
  // 날짜 기본값
  if (type === 'meeting') {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('mf-date').value = today;
  }
}

function hideCpForm(type) {
  const formId = { meeting: 'meetingForm', contact: 'contactForm', deal: 'dealForm' }[type];
  const form = document.getElementById(formId);
  if (form) {
    form.style.display = 'none';
    form.querySelectorAll('input, textarea').forEach(el => el.value = '');
    const sel = form.querySelector('select');
    if (sel) sel.value = '논의중';
  }
}

// 미팅 일지
async function loadCpMeetings(clientName) {
  const list = document.getElementById('meetingsList');
  list.innerHTML = '<div class="cp-loading">로딩중...</div>';
  try {
    const rows = await sbGet(`meetings?client_name=eq.${encodeURIComponent(clientName)}&order=meeting_date.desc`);
    if (!rows?.length) {
      list.innerHTML = '<div class="cp-empty">미팅 일지가 없어요.</div>';
      return;
    }
    list.innerHTML = rows.map(r => `
      <div class="cp-card" data-id="${r.id}">
        <div class="cp-card-header">
          <span class="cp-card-title">${esc(r.meeting_date)}</span>
          <button class="cp-card-delete" onclick="deleteCpRow('meetings','${r.id}','meetings')">🗑</button>
        </div>
        ${r.attendees ? `<div class="cp-card-label">👥 ${esc(r.attendees)}</div>` : ''}
        ${r.summary ? `<div class="cp-card-body" style="margin-top:6px">${esc(r.summary)}</div>` : ''}
        ${r.next_action ? `<div class="cp-card-label" style="margin-top:6px">→ ${esc(r.next_action)}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="cp-empty">로드 실패</div>';
  }
}

async function submitMeeting() {
  if (!cpCurrentClient) return;
  const date = document.getElementById('mf-date').value;
  if (!date) { alert('날짜를 입력하세요.'); return; }
  const data = {
    client_name: cpCurrentClient,
    meeting_date: date,
    attendees: document.getElementById('mf-attendees').value || null,
    summary: document.getElementById('mf-summary').value || null,
    next_action: document.getElementById('mf-next').value || null,
  };
  await sbPost('meetings', data);
  hideCpForm('meeting');
  loadCpMeetings(cpCurrentClient);
}

// 컨택
async function loadCpContacts(clientName) {
  const list = document.getElementById('contactsList');
  list.innerHTML = '<div class="cp-loading">로딩중...</div>';
  try {
    const rows = await sbGet(`contacts?client_name=eq.${encodeURIComponent(clientName)}&order=created_at.asc`);
    if (!rows?.length) {
      list.innerHTML = '<div class="cp-empty">등록된 컨택이 없어요.</div>';
      return;
    }
    list.innerHTML = rows.map(r => `
      <div class="cp-card" data-id="${r.id}">
        <div class="cp-card-header">
          <span class="cp-card-title">${esc(r.name)}${r.role ? ` <span style="font-weight:400;font-size:0.8rem;color:#9a9ab4">${esc(r.role)}</span>` : ''}</span>
          <button class="cp-card-delete" onclick="deleteCpRow('contacts','${r.id}','contacts')">🗑</button>
        </div>
        ${r.telegram ? `<div class="cp-card-label">✈️ ${esc(r.telegram)}</div>` : ''}
        ${r.email ? `<div class="cp-card-label">✉️ ${esc(r.email)}</div>` : ''}
        ${r.notes ? `<div class="cp-card-body" style="margin-top:6px">${esc(r.notes)}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="cp-empty">로드 실패</div>';
  }
}

async function submitContact() {
  if (!cpCurrentClient) return;
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { alert('이름을 입력하세요.'); return; }
  const data = {
    client_name: cpCurrentClient,
    name,
    role: document.getElementById('cf-role').value || null,
    telegram: document.getElementById('cf-telegram').value || null,
    email: document.getElementById('cf-email').value || null,
    notes: document.getElementById('cf-notes').value || null,
  };
  await sbPost('contacts', data);
  hideCpForm('contact');
  loadCpContacts(cpCurrentClient);
}

// 딜
async function loadCpDeals(clientName) {
  const list = document.getElementById('dealsList');
  list.innerHTML = '<div class="cp-loading">로딩중...</div>';
  try {
    const rows = await sbGet(`client_deals?client_name=eq.${encodeURIComponent(clientName)}&order=created_at.desc`);
    if (!rows?.length) {
      list.innerHTML = '<div class="cp-empty">등록된 딜이 없어요.</div>';
      return;
    }
    list.innerHTML = rows.map(r => `
      <div class="cp-card" data-id="${r.id}">
        <div class="cp-card-header">
          <span class="cp-card-title">${esc(r.deal_title || '무제')}
            <span class="cp-status ${r.status || '논의중'}">${esc(r.status || '논의중')}</span>
          </span>
          <button class="cp-card-delete" onclick="deleteCpRow('client_deals','${r.id}','deals')">🗑</button>
        </div>
        ${r.amount ? `<div class="cp-card-label">💰 ${esc(r.amount)}</div>` : ''}
        ${r.structure ? `<div class="cp-card-body" style="margin-top:6px">${esc(r.structure)}</div>` : ''}
        ${r.notes ? `<div class="cp-card-label" style="margin-top:6px">📝 ${esc(r.notes)}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="cp-empty">로드 실패</div>';
  }
}

async function submitDeal() {
  if (!cpCurrentClient) return;
  const title = document.getElementById('df-title').value.trim();
  if (!title) { alert('딜 제목을 입력하세요.'); return; }
  const data = {
    client_name: cpCurrentClient,
    deal_title: title,
    amount: document.getElementById('df-amount').value || null,
    status: document.getElementById('df-status').value,
    structure: document.getElementById('df-structure').value || null,
    notes: document.getElementById('df-notes').value || null,
  };
  await sbPost('client_deals', data);
  hideCpForm('deal');
  loadCpDeals(cpCurrentClient);
}

async function deleteCpRow(table, id, tab) {
  if (!confirm('삭제할까요?')) return;
  await sbDelete(`${table}?id=eq.${id}`);
  if (tab === 'meetings') loadCpMeetings(cpCurrentClient);
  if (tab === 'contacts') loadCpContacts(cpCurrentClient);
  if (tab === 'deals') loadCpDeals(cpCurrentClient);
}

// 프로젝트 행 클릭 → 사이드패널 열기
document.getElementById('projectsBody')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) return; // 버튼 클릭은 무시
  const cell = e.target.closest('.editable-cell');
  if (cell) return; // 편집셀 클릭도 무시
  const tr = e.target.closest('tr[data-id]');
  if (!tr) return;
  const clientName = tr.querySelector('td.editable-cell[data-field="client"]')?.textContent?.trim();
  if (clientName) openClientPanel(clientName);
});
