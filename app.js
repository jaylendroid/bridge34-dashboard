// Supabase 설정
const SUPABASE_URL = 'https://npdzxtnzjkdzwbpphduf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-TVlChpvyWRZEweQ8wHe2g_WxQD5nql';

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
async function getTasks() {
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

// 데이터 로드 및 렌더링
async function initDashboard() {
  try {
    // Tasks 로드
    const tasks = await getTasks();
    renderTasks(tasks);
    
    // Clients 로드
    const clients = await getClients();
    renderClients(clients);
    
    // 시계 업데이트
    updateClock();
    setInterval(updateClock, 1000);
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

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
