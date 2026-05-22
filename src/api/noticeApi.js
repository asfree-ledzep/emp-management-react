import { authFetch } from './apiClient';

const BASE = '/api';

// 공지사항 목록 조회
export const fetchNotices = () =>
  authFetch(`${BASE}/notices`).then(r => r.json());

// 공지사항 등록
export const createNotice = (notice) =>
  authFetch(`${BASE}/notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notice),
  });

// 공지사항 수정
export const updateNotice = (id, notice) =>
  authFetch(`${BASE}/notices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notice),
  });

// 공지사항 삭제
export const deleteNotice = (id) =>
  authFetch(`${BASE}/notices/${id}`, { method: 'DELETE' });

// 카카오 연동 사원 수 조회
export const fetchKakaoConnectedCount = () =>
  authFetch(`${BASE}/kakao/connected-count`).then(r => r.json());

// 카카오 로그인 URL 조회
export const getKakaoAuthUrl = () =>
  authFetch(`${BASE}/kakao/auth-url`).then(r => r.json());

// 카카오 콜백 (코드 → 토큰 저장)
export const connectKakao = (code) =>
  authFetch(`${BASE}/kakao/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
