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

function getSeoulClock(now = new Date()) {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hh = String(kst.getHours()).padStart(2, '0');
  const mi = String(kst.getMinutes()).padStart(2, '0');
  const ss = String(kst.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

function updateClock() {
  const headerRight = document.getElementById('headerRight');
  if (headerRight) {
    headerRight.textContent = `${getSeoulClock()} / Asia/Seoul · 자동 새로고침 30초`;
  }
}

async function loadAll() {
  const [progressClients, discussingClients, openTasks] = await Promise.all([
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EC%A7%84%ED%96%89%EC%A4%91&order=client.asc'),
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EB%85%BC%EC%9D%98%EC%A4%91&order=client.asc'),
    sbGet('tasks?select=id,task,status,assignee,due_date,created_at&status=neq.Done&order=created_at.asc')
  ]);

  renderProjects(progressClients);
  renderTodos(openTasks);
  renderDeals(discussingClients);
}

function renderProjects(rows) {
  const body = document.getElementById('projectsBody');
  if (!body) return;

  if (!rows?.length) {
    body.innerHTML = '<tr><td colspan="3">진행중 프로젝트가 없습니다.</td></tr>';
    return;
  }

  body.innerHTML = rows.slice(0, 20).map((row) => {
    const nextAction = row.next_action || '-';
    const service = row.notes || '-';
    return `
      <tr data-id="${row.id}">
        <td><strong>${esc(row.client || '-')}</strong></td>
        <td><input class="cell-input" data-role="next_action" value="${esc(nextAction)}" /></td>
        <td><input class="cell-input" data-role="notes" value="${esc(service)}" /></td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('tr').forEach((tr) => {
    const id = tr.dataset.id;
    const nextActionInput = tr.querySelector('[data-role="next_action"]');
    const notesInput = tr.querySelector('[data-role="notes"]');

    const save = async () => {
      if (!id) return;
      try {
        await sbPatch(`clients?id=eq.${id}`, {
          next_action: (nextActionInput.value || '').trim() || '-',
          notes: (notesInput.value || '').trim() || '-',
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('프로젝트 업데이트 실패:', err);
      }
    };

    nextActionInput.addEventListener('change', save);
    notesInput.addEventListener('change', save);
  });
}

function renderTodos(tasks) {
  const wrap = document.getElementById('todoGroups');
  if (!wrap) return;

  const targetAssignees = ['Jaylen_77', 'Benbenbennnn'];
  const grouped = Object.fromEntries(targetAssignees.map((name) => [name, []]));

  for (const t of tasks || []) {
    if (grouped[t.assignee]) grouped[t.assignee].push(t);
  }

  wrap.innerHTML = targetAssignees.map((name) => {
    const arr = grouped[name] || [];
    const total = arr.length;
    const undone = arr.filter((x) => (x.status || '').toLowerCase() !== 'done');
    const done = total - undone.length;
    const rate = total ? Math.round((done / total) * 100) : 0;

    const items = undone.map((t) => `
      <label class="todo-item">
        <input type="checkbox" data-task-id="${t.id}" />
        <span>${esc(t.task || '(제목 없음)')}</span>
      </label>
    `).join('');

    return `
      <section class="todo-group" data-assignee="${esc(name)}">
        <div class="todo-head">
          <div class="todo-name">${esc(name)}</div>
          <div class="todo-rate">완료율 ${rate}%</div>
        </div>
        <div class="progress"><div class="progress-fill" style="width:${rate}%"></div></div>
        ${items || '<div class="empty">미완료 없음</div>'}
      </section>
    `;
  }).join('');

  wrap.querySelectorAll('input[type="checkbox"][data-task-id]').forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.dataset.taskId;
      if (!id || !e.target.checked) return;
      try {
        await sbPatch(`tasks?id=eq.${id}`, { status: 'Done' });
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

  wrap.innerHTML = list.map((r) => {
    const detail = (r.next_action || '').trim() || '상세 없음';
    return `
      <article class="deal-card" data-id="${r.id}">
        <div class="deal-title">${esc(r.client || '-')}</div>
        <div class="deal-tag">${esc(detail)}</div>
      </article>
    `;
  }).join('');

  wrap.querySelectorAll('.deal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const row = list.find((x) => String(x.id) === card.dataset.id);
      if (!row) return;
      document.getElementById('dealModalTitle').textContent = row.client || 'Untitled';
      document.getElementById('dealModalNextAction').textContent = `다음 액션: ${(row.next_action || '').trim() || '상세 없음'}`;
      document.getElementById('dealModalNotes').textContent = `노트: ${(row.notes || '').trim() || '-'}`;
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
