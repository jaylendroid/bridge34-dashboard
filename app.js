const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

const ASSIGNEE_ORDER = ['Jaylen_77', 'Benbenbennnn'];

function headers(prefer = false) {
  return {
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: 'return=representation' } : {})
  };
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function supabasePatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: headers(true),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function getFallbackImportance(clientId) {
  return localStorage.getItem(`importance:${clientId}`) || '-';
}

function setFallbackImportance(clientId, value) {
  localStorage.setItem(`importance:${clientId}`, value || '-');
}

function normalizedServices(row) {
  // clients.services 컬럼이 없을 수 있어 notes를 임시 계약서비스로 사용.
  return row.services ?? row.notes ?? '-';
}

async function loadClients() {
  const rows = await supabaseGet('clients?select=*&order=client.asc');
  return {
    inProgress: rows.filter(r => r.category === '진행중'),
    discussing: rows.filter(r => r.category === '논의중')
  };
}

async function loadTasks() {
  const allTasks = await supabaseGet('tasks?select=*&order=created_at.desc&limit=500');
  const openTasks = allTasks.filter(t => (t.status || '') !== 'Done');
  return { allTasks, openTasks };
}

function renderProjects(rows) {
  const body = document.getElementById('projectsBody');
  body.innerHTML = '';

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="3" class="muted">진행중 프로젝트가 없습니다.</td></tr>';
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    const importanceValue = row.importance ?? getFallbackImportance(row.id);
    const servicesValue = normalizedServices(row);

    tr.innerHTML = `
      <td><strong>${row.client || '-'}</strong></td>
      <td>
        <input class="editable" value="${escapeHtml(importanceValue)}" data-role="importance" />
        <button class="save-btn" data-role="save">저장</button>
      </td>
      <td>
        <input class="editable" value="${escapeHtml(servicesValue)}" data-role="services" />
      </td>
    `;

    tr.querySelector('[data-role="save"]').addEventListener('click', async () => {
      const importance = tr.querySelector('[data-role="importance"]').value.trim() || '-';
      const services = tr.querySelector('[data-role="services"]').value.trim() || '-';

      try {
        await supabasePatch(`clients?id=eq.${row.id}`, {
          // importance 컬럼이 없으면 오류가 날 수 있어 fallback 처리
          importance,
          notes: services,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        // importance DDL 미적용 환경 대비: 로컬 fallback + notes만 재시도
        setFallbackImportance(row.id, importance);
        try {
          await supabasePatch(`clients?id=eq.${row.id}`, {
            notes: services,
            updated_at: new Date().toISOString()
          });
        } catch (e2) {
          alert(`저장 실패: ${e2.message}`);
          return;
        }
      }
      alert('저장되었습니다.');
    });

    body.appendChild(tr);
  });
}

function groupedTasks(openTasks, allTasks) {
  const map = {};
  [...ASSIGNEE_ORDER, ...allTasks.map(t => t.assignee).filter(Boolean)].forEach(name => {
    if (!name) return;
    if (!map[name]) map[name] = { open: [], total: 0, done: 0 };
  });

  allTasks.forEach(t => {
    const a = t.assignee || 'Unassigned';
    map[a] ||= { open: [], total: 0, done: 0 };
    map[a].total += 1;
    if ((t.status || '') === 'Done') map[a].done += 1;
  });

  openTasks.forEach(t => {
    const a = t.assignee || 'Unassigned';
    map[a] ||= { open: [], total: 0, done: 0 };
    map[a].open.push(t);
  });

  return map;
}

function renderTodos(openTasks, allTasks) {
  const grid = document.getElementById('todoGrid');
  grid.innerHTML = '';

  const grouped = groupedTasks(openTasks, allTasks);
  const assignees = Object.keys(grouped);

  if (!assignees.length) {
    grid.innerHTML = '<div class="muted">표시할 할일이 없습니다.</div>';
    return;
  }

  assignees.forEach(assignee => {
    const box = grouped[assignee];
    const progress = box.total ? Math.round((box.done / box.total) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'todo-card';

    card.innerHTML = `
      <div class="todo-title">${assignee}</div>
      <div class="muted">완료율 ${progress}% (${box.done}/${box.total})</div>
      <div class="progress"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div data-role="items"></div>
    `;

    const items = card.querySelector('[data-role="items"]');
    if (!box.open.length) {
      items.innerHTML = '<div class="muted">미완료 항목 없음</div>';
    } else {
      box.open.forEach(task => {
        const item = document.createElement('label');
        item.className = 'todo-item';
        item.innerHTML = `
          <input type="checkbox" data-task-id="${task.id}" />
          <span>${escapeHtml(task.task || '(제목 없음)')} ${task.due_date ? `· ${task.due_date}` : ''}</span>
        `;

        item.querySelector('input').addEventListener('change', async (e) => {
          if (!e.target.checked) return;
          try {
            await supabasePatch(`tasks?id=eq.${task.id}`, { status: 'Done' });
            await refreshDashboard();
          } catch (err) {
            alert(`완료 업데이트 실패: ${err.message}`);
          }
        });

        items.appendChild(item);
      });
    }

    grid.appendChild(card);
  });
}

function renderDeals(rows) {
  const wrap = document.getElementById('dealsWrap');
  wrap.innerHTML = '';

  if (!rows.length) {
    wrap.innerHTML = '<div class="muted">논의중 딜이 없습니다.</div>';
    return;
  }

  rows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'deal-card';
    card.innerHTML = `
      <div><strong>${escapeHtml(row.client || '-')}</strong></div>
      <div class="muted" style="margin-top:6px;">${escapeHtml((row.next_action || '상세 없음').slice(0, 40))}</div>
    `;

    card.addEventListener('click', () => {
      document.getElementById('dealTitle').textContent = row.client || 'Untitled';
      document.getElementById('dealBody').innerHTML = `
        <div>카테고리: ${escapeHtml(row.category || '-')}</div>
        <div style="margin-top:8px;">노트: ${escapeHtml(row.notes || '-')}</div>
        <div style="margin-top:8px;">다음 액션: ${escapeHtml(row.next_action || '-')}</div>
      `;
      document.getElementById('dealModal').style.display = 'flex';
    });

    wrap.appendChild(card);
  });
}

function closeDealModal() {
  document.getElementById('dealModal').style.display = 'none';
}
window.closeDealModal = closeDealModal;

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function refreshDashboard() {
  try {
    const [{ inProgress, discussing }, { allTasks, openTasks }] = await Promise.all([
      loadClients(),
      loadTasks()
    ]);

    renderProjects(inProgress);
    renderTodos(openTasks, allTasks);
    renderDeals(discussing);
  } catch (e) {
    console.error(e);
  }
}

updateClock();
refreshDashboard();
setInterval(updateClock, 1000);
setInterval(refreshDashboard, 30000);
