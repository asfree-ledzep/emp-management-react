import { authFetch } from './apiClient';

const BASE = '/api/todo';

export const fetchTodos  = ()              => authFetch(BASE).then(r => r.json());
export const addTodo     = (data)          => authFetch(BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json());
export const editTodo    = (id, data)      => authFetch(`${BASE}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json());
export const toggleTodo  = (id)            => authFetch(`${BASE}/${id}/toggle`, { method:'POST' }).then(r => r.json());
export const deleteTodo  = (id)            => authFetch(`${BASE}/${id}`, { method:'DELETE' }).then(r => r.json());
export const reorderTodos = (ids)          => authFetch(`${BASE}/reorder`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(ids) }).then(r => r.json());
