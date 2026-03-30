const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

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

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getDateParts(now = new Date()) {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[kst.getDay()];

  const hh = String(kst.getHours()).padStart(2, '0');
  const mi = String(kst.getMinutes()).padStart(2, '0');
  const ss = String(kst.getSeconds()).padStart(2, '0');

  return {
    dateText: `${yyyy}.${mm}.${dd} (${day})`,
    clockText: `${hh}:${mi}:${ss} KST`
  };
}

function updateClock() {
  const { dateText, clockText } = getDateParts();
  const dateEl = document.getElementById('date');
  const clockEl = document.getElementById('clock');
  if (dateEl) dateEl.textContent = dateText;
  if (clockEl) clockEl.textContent = clockText;
}

async function loadAll() {
  const [progressClients, discussingClients, allTasks] = await Promise.all([
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EC%A7%84%ED%96%89%EC%A4%91&order=updated_at.desc.nullslast,client.asc'),
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EB%85%BC%EC%9D%98%EC%A4%91&order=updated_at.desc.nullslast,client.asc'),
    sbGet('tasks?select=id,task,status,assignee,due_date,created_at&order=created_at.desc&limit=500')
  ]);

  renderProjects(progressClients);
  renderTodos(allTasks);
  renderDeals(discussingClients);
}

function renderProjects(rows) {
  const body = document.getElementById('projectsBody');
  if (!body) return;

  if (!rows?.length) {
    body.innerHTML = '<tr><td colspan="4">진행중 프로젝트가 없습니다.</td></tr>';
    return;
  }

  const top20 = rows.slice(0, 20);
  body.innerHTML = top20.map((row, idx) => {
    const schedule = row.next_action || '-';
    const service = row.notes || '-';
    return `
      <tr data-id="${row.id}">
        <td>${idx + 1}</td>
        <td><strong>${esc(row.client || '-')}</strong></td>
        <td><input class="cell-input" data-role="next_action" value="${esc(schedule)}" /></td>
        <td><input class="cell-input" data-role="notes" value="${esc(service)}" /></td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('tr').forEach((tr) => {
    const id = tr.dataset.id;
    const scheduleInput = tr.querySelector('[data-role="next_action"]');
    const notesInput = tr.querySelector('[data-role="notes"]');

    const save = async () => {
      if (!id) return;
      try {
        await sbPatch(`clients?id=eq.${id}`, {
          next_action: (scheduleInput.value || '').trim() || '-',
          notes: (notesInput.value || '').trim() || '-',
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('프로젝트 업데이트 실패:', err);
      }
    };

    scheduleInput.addEventListener('change', save);
    notesInput.addEventListener('change', save);
  });
}

function renderTodos(tasks) {
  const wrap = document.getElementById('todoGroups');
  if (!wrap) return;

  const grouped = {};
  for (const t of tasks || []) {
    const assignee = t.assignee || 'Unassigned';
    if (!grouped[assignee]) grouped[assignee] = [];
    grouped[assignee].push(t);
  }

  const assignees = Object.keys(grouped);
  if (!assignees.length) {
    wrap.innerHTML = '<div class="empty">할 일 없음 ✅</div>';
    return;
  }

  wrap.innerHTML = assignees.map((name) => {
    const arr = grouped[name];
    const done = arr.filter((x) => (x.status || '').toLowerCase() === 'done').length;
    const total = arr.length;
    const rate = total ? Math.round((done / total) * 100) : 0;

    const items = arr.map((t) => {
      const isDone = (t.status || '').toLowerCase() === 'done';
      return `
        <label class="todo-item ${isDone ? 'done' : ''}">
          <input type="checkbox" data-task-id="${t.id}" ${isDone ? 'checked' : ''} />
          <span>${esc(t.task || '(제목 없음)')}</span>
        </label>
      `;
    }).join('');

    return `
      <section class="todo-group" data-assignee="${esc(name)}">
        <div class="todo-head">
          <div class="todo-name">👤 ${esc(name)}</div>
          <div class="todo-rate">${done}/${total}</div>
        </div>
        <div class="progress"><div class="progress-fill" style="width:${rate}%"></div></div>
        ${items || '<div class="empty">할 일 없음 ✅</div>'}
      </section>
    `;
  }).join('');

  wrap.querySelectorAll('input[type="checkbox"][data-task-id]').forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.taskId;
      const done = e.target.checked;
      try {
        await sbPatch(`tasks?id=eq.${id}`, { status: done ? 'Done' : 'Todo' });
        await loadAll();
      } catch (err) {
        console.error('할 일 상태 변경 실패:', err);
      }
    });
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
      <div>🟡 ${esc(r.client || '-')}</div>
      <div class="deal-tag">논의중</div>
    </article>
  `).join('');

  wrap.querySelectorAll('.deal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const row = list.find((x) => String(x.id) === card.dataset.id);
      if (!row) return;
      document.getElementById('dealModalTitle').textContent = row.client || 'Untitled';
      document.getElementById('dealModalNextAction').textContent = `다음 액션: ${row.next_action || '-'}`;
      document.getElementById('dealModalNotes').textContent = `노트: ${row.notes || '-'}`;
      document.getElementById('dealModal').style.display = 'flex';
    });
  });
}

function closeDealModal() {
  document.getElementById('dealModal').style.display = 'none';
}

window.closeDealModal = closeDealModal;

updateClock();
loadAll().catch((e) => console.error('초기 로드 실패:', e));
setInterval(updateClock, 1000);
setInterval(() => loadAll().catch((e) => console.error('주기 로드 실패:', e)), 30000);
