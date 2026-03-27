// Supabase 클라이언트 설정
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 또는 환경변수가 없으면 직접 설정 (배포 시 env 파일로 대체)
const supabaseConfig = {
  url: SUPABASE_URL || localStorage.getItem('supabase_url'),
  key: SUPABASE_KEY || localStorage.getItem('supabase_key')
};

// Supabase API 호출 함수
async function supabaseQuery(table, method = 'GET', data = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseConfig.key}`,
    'apikey': supabaseConfig.key
  };

  const options = {
    method,
    headers
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(
    `${supabaseConfig.url}/rest/v1/${table}`,
    options
  );

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.statusText}`);
  }

  return response.json();
}

// Tasks 관련 함수
export async function getTasks() {
  return supabaseQuery('tasks');
}

export async function addTask(task) {
  return supabaseQuery('tasks', 'POST', task);
}

export async function updateTask(id, task) {
  return supabaseQuery(`tasks?id=eq.${id}`, 'PATCH', task);
}

export async function deleteTask(id) {
  return supabaseQuery(`tasks?id=eq.${id}`, 'DELETE');
}

// Clients 관련 함수
export async function getClients() {
  return supabaseQuery('clients');
}

export async function addClient(client) {
  return supabaseQuery('clients', 'POST', client);
}

export async function updateClient(id, client) {
  return supabaseQuery(`clients?id=eq.${id}`, 'PATCH', client);
}

export async function deleteClient(id) {
  return supabaseQuery(`clients?id=eq.${id}`, 'DELETE');
}

// Events 관련 함수
export async function getEvents(date = null) {
  if (date) {
    return supabaseQuery(`events?start_time=gte.${date}T00:00:00`);
  }
  return supabaseQuery('events');
}
