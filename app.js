// Supabase 설정
const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

// 현재 선택된 날짜
let currentDate = new Date();

// Supabase 기본 함수
async function supabaseQuery(table, filters = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error(`Supabase error: ${response.statusText}`);
    return [];
  }
  return response.json();
}

// Tasks CRUD
async function getTasks(filterDate = null) {
  if (filterDate) {
    const dateStr = filterDate.toISOString().split('T')[0];
    return supabaseQuery('tasks', `date=eq.${dateStr}&order=created_at.desc`);
  }
  return supabaseQuery('tasks', 'order=created_at.desc');
}

async function addTask(task) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });
  return response.json();
}

async function updateTask(id, updates) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
}

async function deleteTask(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.status === 204;
}

// Clients CRUD
async function getClients() {
  return supabaseQuery('clients', 'order=client.asc');
}

async function addClient(client) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(client)
  });
  return response.json();
}

async function updateClient(id, updates) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
}

async function deleteClient(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.status === 204;
}

// Events (Calendar) 조회
async function getEvents(filterDate = null) {
  if (filterDate) {
    const dateStr = filterDate.toISOString().split('T')[0];
    return supabaseQuery('events', `start_time=gte.${dateStr}T00:00:00&order=start_time.asc`);
  }
  return supabaseQuery('events', 'order=start_time.asc');
}

// 시계 업데이트
function updateClock() {
  const now = new Date();
  const kstTime = now.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const clockEl = document.querySelector('.clock');
  if (clockEl) clockEl.textContent = kstTime;
}

// 날짜 포맷팅
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  return `${year}-${month}-${day} (${dayName})`;
}

// 날짜 선택 UI 업데이트
function updateDateDisplay() {
  const dateEl = document.querySelector('.date-display');
  if (dateEl) {
    dateEl.textContent = formatDate(currentDate);
  }
  loadDashboard();
}

// 날짜 변경
function changeDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateDateDisplay();
}

// 데이터 로드 및 렌더링
async function loadDashboard() {
  try {
    const tasks = await getTasks(currentDate);
    renderTasks(tasks);
    
    const clients = await getClients();
    renderClients(clients);
    
    const events = await getEvents(currentDate);
    renderSchedules(events);
    
    updateClock();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

function renderTasks(tasks) {
  const toDoCol = document.querySelector('[data-status="To-Do"]');
  const inProgressCol = document.querySelector('[data-status="In Progress"]');
  const doneCol = document.querySelector('[data-status="Done"]');
  
  if (!toDoCol || !inProgressCol || !doneCol) return;
  
  toDoCol.innerHTML = '<div class="column-title">To-Do</div>';
  inProgressCol.innerHTML = '<div class="column-title">In Progress</div>';
  doneCol.innerHTML = '<div class="column-title">Done</div>';
  
  tasks.forEach(task => {
    const card = createTaskCard(task);
    const col = 
      task.status === 'In Progress' ? inProgressCol :
      task.status === 'Done' ? doneCol :
      toDoCol;
    col.appendChild(card);
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card ${task.priority ? task.priority.toLowerCase() : ''}`;
  card.innerHTML = `
    <div class="task-header">
      <span class="task-title">${task.task}</span>
      <span class="task-close" data-id="${task.id}">✕</span>
    </div>
    <div class="task-meta">
      <span class="task-client">${task.client || '—'}</span>
      ${task.due_date ? `<span class="task-due">${task.due_date}</span>` : ''}
    </div>
    ${task.assignee ? `<div class="task-assignee">@${task.assignee}</div>` : ''}
  `;
  
  card.querySelector('.task-close').addEventListener('click', async () => {
    await deleteTask(task.id);
    card.remove();
  });
  
  return card;
}

function renderClients(clients) {
  const clientsList = document.querySelector('.clients-table tbody');
  if (!clientsList) return;
  
  clientsList.innerHTML = '';
  clients.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.client}</td>
      <td>${client.category || '—'}</td>
      <td>${client.assignee || '—'}</td>
      <td>${client.kol || '—'}</td>
      <td>${client.community || '—'}</td>
      <td><span class="risk-${client.risk?.toLowerCase() || 'grey'}">${client.risk || '—'}</span></td>
      <td><span class="close-btn" data-id="${client.id}">✕</span></td>
    `;
    
    row.querySelector('.close-btn').addEventListener('click', async () => {
      await deleteClient(client.id);
      row.remove();
    });
    
    clientsList.appendChild(row);
  });
}

function renderSchedules(events) {
  const schedulesList = document.querySelector('.schedules-list');
  if (!schedulesList) return;
  
  if (events.length === 0) {
    schedulesList.innerHTML = '<div class="schedule-empty">일정이 없습니다.</div>';
    return;
  }
  
  schedulesList.innerHTML = '';
  events.forEach(event => {
    const startTime = new Date(event.start_time);
    const time = startTime.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.innerHTML = `
      <div class="schedule-time">${time}</div>
      <div class="schedule-title">${event.summary}</div>
      ${event.meet_link ? `<a href="${event.meet_link}" target="_blank" class="schedule-link">Meet</a>` : ''}
    `;
    schedulesList.appendChild(item);
  });
}

// Task 추가 모달
function showAddTaskModal() {
  const modal = document.getElementById('taskModal');
  if (modal) {
    modal.style.display = 'flex';
    document.querySelector('input[name="taskName"]').focus();
  }
}

function closeTaskModal() {
  const modal = document.getElementById('taskModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function submitAddTask() {
  const taskName = document.querySelector('input[name="taskName"]').value;
  const client = document.querySelector('input[name="taskClient"]').value;
  const assignee = document.querySelector('input[name="taskAssignee"]').value;
  const status = document.querySelector('select[name="taskStatus"]').value;
  
  if (!taskName.trim()) {
    alert('Task 이름을 입력하세요.');
    return;
  }
  
  const dateStr = currentDate.toISOString().split('T')[0];
  
  await addTask({
    task: taskName,
    client: client || null,
    assignee: assignee || null,
    status: status,
    date: dateStr
  });
  
  closeTaskModal();
  loadDashboard();
}

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setInterval(updateClock, 1000);
  });
} else {
  loadDashboard();
  setInterval(updateClock, 1000);
}
