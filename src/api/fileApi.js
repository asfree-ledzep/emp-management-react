import { authFetch } from './apiClient';

const BASE = '/api/files';

// ── R2 준비 여부 ──
export const fetchR2Status = () =>
  authFetch(`${BASE}/status`).then(r => r.json());

// ── 사원: 목록 조회 (scope=ALL|DEPT) ──
export const fetchFiles = (scope) =>
  authFetch(`${BASE}?scope=${scope}`).then(r => r.json());

// ── 관리자: 목록 조회 (scope/deptno 선택) ──
export const fetchAdminFiles = (scope = '', deptno = null) => {
  const params = new URLSearchParams();
  if (scope)  params.append('scope',  scope);
  if (deptno) params.append('deptno', deptno);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return authFetch(`${BASE}/admin/all${qs}`).then(r => r.json());
};

// ── 파일 업로드 (multipart) ──
export const uploadFile = (file, scope, deptno = null) => {
  const form = new FormData();
  form.append('file',  file);
  form.append('scope', scope);
  if (deptno) form.append('deptno', deptno);
  return authFetch(`${BASE}/upload`, { method: 'POST', body: form });
};

// ── 파일 다운로드 (서버 스트리밍) ──
export const downloadFile = async (fileId, fileName) => {
  const res = await authFetch(`${BASE}/${fileId}/download`);
  if (!res.ok) throw new Error('다운로드 실패');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── 파일 삭제 ──
export const deleteFile = (fileId) =>
  authFetch(`${BASE}/${fileId}`, { method: 'DELETE' });
