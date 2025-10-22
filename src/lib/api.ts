const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/api';
const AUTH_HEADER = 'Basic ' + btoa('admin:password123');

interface Task {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  task_id: number | null;
  updated_content: any;
  notes: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export async function fetchTasks(page: number = 1, search: string = ''): Promise<PaginatedResponse<Task>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '5',
  });
  
  if (search) {
    params.append('search', search);
  }

  const data = await apiRequest(`tasks?${params}`);
  return {
    data: data.tasks,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
  };
}

export async function createTask(title: string, description: string): Promise<Task> {
  return apiRequest('tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });
}

export async function updateTask(id: number, title: string, description: string): Promise<Task> {
  return apiRequest(`tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, description }),
  });
}

export async function deleteTask(id: number): Promise<void> {
  return apiRequest(`tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAuditLogs(page: number = 1): Promise<PaginatedResponse<AuditLog>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '5',
  });

  const data = await apiRequest(`logs?${params}`);
  return {
    data: data.logs,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
  };
}

export type { Task, AuditLog, PaginatedResponse };
