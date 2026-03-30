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
  const MAX_SHOW = 6;
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
  const editor = field === 'notes' ? document.createElement('textarea') : document.createElement('input');
  editor.className = 'inline-editor';
  if (editor.tagName === 'INPUT') editor.type = 'text';
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
    if (e.key === 'Enter' && !(editor.tagName === 'TEXTAREA' && e.shiftKey)) {
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
        client: '',
        next_action: '',
        notes: '',
        category: '진행중'
      });
      await loadAll();
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
      ${esc(r.client || '-')}
    </article>
  `).join('');

  wrap.querySelectorAll('.deal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const row = list.find((x) => String(x.id) === card.dataset.id);
      if (!row) return;
      document.getElementById('dealModalTitle').textContent = row.client || 'Untitled';
      document.getElementById('dealModal').style.display = 'flex';
    });
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

function closeDealModal() {
  document.getElementById('dealModal').style.display = 'none';
}

window.closeDealModal = closeDealModal;

updateClock();
updateScheduleTitles();
bindProjectAddButton();
loadAll().catch((e) => console.error('초기 로드 실패:', e));
setInterval(updateClock, 1000);
setInterval(() => {
  updateScheduleTitles();
  loadAll().catch((e) => console.error('주기 로드 실패:', e));
}, 30000);
