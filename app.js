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
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EC%A7%84%ED%96%89%EC%A4%91&order=client.asc'),
    sbGet('clients?select=id,client,next_action,notes,category&category=eq.%EB%85%BC%EC%9D%98%EC%A4%91&order=client.asc'),
    sbGet('tasks?select=id&status=neq.Done&order=created_at.asc'),
    sbGet(`events?select=id,start_time,summary&start_time=gte.${todayRange.start}&start_time=lt.${todayRange.end}&order=start_time.asc`),
    sbGet(`events?select=id,start_time,summary&start_time=gte.${tomorrowRange.start}&start_time=lt.${tomorrowRange.end}&order=start_time.asc`)
  ]);

  renderProjects(projects);
  renderDeals(deals);
  renderSchedule(todayEvents, 'todayList');
  renderSchedule(tomorrowEvents, 'tomorrowList');
}

function renderProjects(rows) {
  const body = document.getElementById('projectsBody');
  if (!body) return;

  if (!rows?.length) {
    body.innerHTML = '<tr><td colspan="4">진행중 프로젝트가 없습니다.</td></tr>';
    return;
  }

  body.innerHTML = rows.slice(0, 20).map((row, idx) => {
    const baseDate = row.next_action || '-';
    const service = row.notes || '-';
    return `
      <tr data-id="${row.id}">
        <td>${idx + 1}</td>
        <td><strong>${esc(row.client || '-')}</strong></td>
        <td><input class="cell-input" data-role="next_action" value="${esc(baseDate)}" /></td>
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
loadAll().catch((e) => console.error('초기 로드 실패:', e));
setInterval(updateClock, 1000);
setInterval(() => {
  updateScheduleTitles();
  loadAll().catch((e) => console.error('주기 로드 실패:', e));
}, 30000);
