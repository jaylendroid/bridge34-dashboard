// Supabase 설정
const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

// 현재 선택된 날짜 (초기값: 오늘)
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
  if (response.ok) return response.json();
  console.error('Failed to add task');
  return null;
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
  if (response.ok) return response.json();
  console.error('Failed to add client');
  return null;
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
  if (!filterDate) return [];
  
  const dateStr = filterDate.toISOString().split('T')[0];
  const isToday = dateStr === new Date().toISOString().split('T')[0];
  
  if (isToday) {
    // 오늘: 현재 시간부터
    const now = new Date().toISOString();
    return supabaseQuery('events', `start_time=gte.${now}&order=start_time.asc`);
  } else {
    // 내일 이후: 오전 11시부터
    const timeStr = dateStr + 'T11:00:00';
    return supabaseQuery('events', `start_time=gte.${timeStr}&order=start_time.asc`);
  }
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
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const isToday = date.toDateString() === new Date().toDateString();
  
  let prefix = '';
  if (isToday) prefix = '[오늘] ';
  
  return `${prefix}${year}-${month}-${day} (${dayName})`;
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
    document.querySelector('input[name="taskName"]').value = '';
    document.querySelector('input[name="taskClient"]').value = '';
    document.querySelector('input[name="taskAssignee"]').value = '';
    document.querySelector('select[name="taskStatus"]').value = 'To-Do';
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
  
  const newTask = await addTask({
    task: taskName,
    client: client || null,
    assignee: assignee || null,
    status: status,
    date: dateStr
  });
  
  if (newTask) {
    closeTaskModal();
    loadDashboard();
    alert('Task가 추가되었습니다!');
  } else {
    alert('Task 추가 실패!');
  }
}

// Client 추가 모달
function showAddClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.style.display = 'flex';
    document.querySelector('input[name="clientName"]').focus();
  }
}

function closeClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.style.display = 'none';
    document.querySelector('input[name="clientName"]').value = '';
    document.querySelector('select[name="clientCategory"]').value = '진행중';
    document.querySelector('input[name="clientAssignee"]').value = '';
    document.querySelector('input[name="clientKol"]').value = '';
    document.querySelector('input[name="clientCommunity"]').value = '';
    document.querySelector('select[name="clientRisk"]').value = 'Green';
  }
}

async function submitAddClient() {
  const clientName = document.querySelector('input[name="clientName"]').value;
  const category = document.querySelector('select[name="clientCategory"]').value;
  const assignee = document.querySelector('input[name="clientAssignee"]').value;
  const kol = document.querySelector('input[name="clientKol"]').value;
  const community = document.querySelector('input[name="clientCommunity"]').value;
  const risk = document.querySelector('select[name="clientRisk"]').value;
  
  if (!clientName.trim()) {
    alert('Client 이름을 입력하세요.');
    return;
  }
  
  const newClient = await addClient({
    client: clientName,
    category: category,
    assignee: assignee || null,
    kol: kol || null,
    community: community || null,
    risk: risk
  });
  
  if (newClient) {
    closeClientModal();
    loadDashboard();
    alert('Client가 추가되었습니다!');
  } else {
    alert('Client 추가 실패!');
  }
}

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateDateDisplay();
    setInterval(updateClock, 1000);
  });
} else {
  updateDateDisplay();
  setInterval(updateClock, 1000);
}
