import { authFetch } from './apiClient';

const BASE = '/api/leave';

// ── 사원: 잔여 연차 ──
export const fetchMyBalance = () =>
  authFetch(`${BASE}/balance`).then(r => r.json());

// ── 사원: 본인 신청 내역 ──
export const fetchMyLeaves = () =>
  authFetch(`${BASE}/my`).then(r => r.json());

// ── 사원: 연차 신청 ──
export const applyLeave = (data) =>
  authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── 사원: 신청 취소 ──
export const cancelLeave = (leaveId) =>
  authFetch(`${BASE}/${leaveId}`, { method: 'DELETE' });

// ── MGR: 1차 대기 목록 ──
export const fetchMgrPending = () =>
  authFetch(`${BASE}/mgr/pending`).then(r => r.json());

// ── MGR: 1차 승인 ──
export const mgrApprove = (leaveId, comment = '') =>
  authFetch(`${BASE}/${leaveId}/mgr-approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });

// ── MGR: 1차 반려 ──
export const mgrReject = (leaveId, comment = '') =>
  authFetch(`${BASE}/${leaveId}/mgr-reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });

// ── ADMIN: 전체 목록 ──
export const fetchAllLeaves = () =>
  authFetch(`${BASE}/admin/all`).then(r => r.json());

// ── ADMIN: 최종 승인 ──
export const adminApprove = (leaveId, comment = '') =>
  authFetch(`${BASE}/${leaveId}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });

// ── ADMIN: 최종 반려 ──
export const adminReject = (leaveId, comment = '') =>
  authFetch(`${BASE}/${leaveId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
