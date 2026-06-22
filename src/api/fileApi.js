import { authFetch } from './apiClient';

const BASE  = '/api/files';
const BFOLD = '/api/folders';

// ── R2 준비 여부 ──
export const fetchR2Status = () =>
  authFetch(`${BASE}/status`).then(r => r.json());

// ── 사원: 파일 목록 조회 (scope=ALL|DEPT, folderId=null이면 루트) ──
export const fetchFiles = (scope, folderId = null) => {
  const params = new URLSearchParams({ scope });
  if (folderId != null) params.append('folderId', folderId);
  return authFetch(`${BASE}?${params.toString()}`).then(r => r.json());
};

// ── 관리자: 파일 목록 조회 (scope/deptno/folderId 선택) ──
export const fetchAdminFiles = (scope = '', deptno = null, folderId = null) => {
  const params = new URLSearchParams();
  if (scope)          params.append('scope',    scope);
  if (deptno)         params.append('deptno',   deptno);
  if (folderId != null) params.append('folderId', folderId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return authFetch(`${BASE}/admin/all${qs}`).then(r => r.json());
};

// ── 파일 업로드 (multipart) ──
export const uploadFile = (file, scope, deptno = null, folderId = null) => {
  const form = new FormData();
  form.append('file',  file);
  form.append('scope', scope);
  if (deptno   != null) form.append('deptno',   deptno);
  if (folderId != null) form.append('folderId',  folderId);
  return authFetch(`${BASE}/upload`, { method: 'POST', body: form });
};

// ── 파일 다운로드 (R2 Pre-signed URL) ──
export const downloadFile = async (fileId, fileName) => {
  const res = await authFetch(`${BASE}/${fileId}/download-url`);
  if (!res.ok) throw new Error('다운로드 URL 요청 실패');
  const { url } = await res.json();
  const a = document.createElement('a');
  a.href = url;
  a.rel  = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// ── 파일 삭제 ──
export const deleteFile = (fileId) =>
  authFetch(`${BASE}/${fileId}`, { method: 'DELETE' });

// ── 파일 폴더 이동 ──
export const moveFile = (fileId, folderId) =>
  authFetch(`${BASE}/${fileId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId }),
  });

// ════════════════════════════════
//  폴더 API
// ════════════════════════════════

// ── 폴더 목록 조회 (parentId=null이면 루트) ──
export const fetchFolders = (scope, deptno = null, parentId = null) => {
  const params = new URLSearchParams({ scope });
  if (deptno   != null) params.append('deptno',   deptno);
  if (parentId != null) params.append('parentId',  parentId);
  return authFetch(`${BFOLD}?${params.toString()}`).then(r => r.json());
};

// ── 폴더 생성 ──
export const createFolder = (folderName, scope, deptno = null, parentId = null) =>
  authFetch(BFOLD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderName, scope, deptno, parentId }),
  });

// ── 폴더 이름 변경 ──
export const renameFolder = (folderId, folderName) =>
  authFetch(`${BFOLD}/${folderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderName }),
  });

// ── 폴더 삭제 ──
export const deleteFolder = (folderId) =>
  authFetch(`${BFOLD}/${folderId}`, { method: 'DELETE' });
