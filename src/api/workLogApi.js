import { authFetch } from './apiClient';

const BASE = '/api/worklog';

export const fetchMyLogs    = ()             => authFetch(`${BASE}/my`).then(r => r.json());
export const fetchLogById   = (id)           => authFetch(`${BASE}/${id}`).then(r => r.json());
export const saveLog        = (data)         => authFetch(BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json());
export const editLog        = (id, data)     => authFetch(`${BASE}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json());
export const submitLog      = (id)           => authFetch(`${BASE}/${id}/submit`, { method:'POST' }).then(r => r.json());
export const deleteLog      = (id)           => authFetch(`${BASE}/${id}`, { method:'DELETE' }).then(r => r.json());

// 팀장
export const fetchMgrPendingLogs = ()        => authFetch(`${BASE}/mgr/pending`).then(r => r.json());
export const fetchMgrAllLogs     = ()        => authFetch(`${BASE}/mgr/all`).then(r => r.json());
export const mgrApproveLog       = (id, comment) => authFetch(`${BASE}/${id}/mgr-approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ comment }) }).then(r => r.json());
export const mgrRejectLog        = (id, reason, comment) => authFetch(`${BASE}/${id}/mgr-reject`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason, comment }) }).then(r => r.json());

// 관리자
export const fetchAdminPendingLogs = ()      => authFetch(`${BASE}/admin/pending`).then(r => r.json());
export const fetchAdminAllLogs     = ()      => authFetch(`${BASE}/admin/all`).then(r => r.json());
export const adminApproveLog       = (id, comment) => authFetch(`${BASE}/${id}/admin-approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ comment }) }).then(r => r.json());
export const adminRejectLog        = (id, reason, comment) => authFetch(`${BASE}/${id}/admin-reject`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason, comment }) }).then(r => r.json());
