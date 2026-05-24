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

// 공지 읽음 처리 (사원 호출)
export const markNoticeRead = (id) =>
  authFetch(`${BASE}/notices/${id}/read`, { method: 'POST' });

// 공지별 읽음 현황 (관리자 전용)
export const fetchNoticeReadSummary = (id) =>
  authFetch(`${BASE}/notices/${id}/reads`).then(r => r.json());

// 사원 미읽음 공지 수
export const fetchUnreadNoticeCount = () =>
  authFetch(`${BASE}/notices/unread-count`).then(r => r.json());

// 카카오 연동 사원 수 조회
export const fetchKakaoConnectedCount = () =>
  authFetch(`${BASE}/kakao/connected-count`).then(r => r.json());

// 카카오 연동/미연동 직원 현황 조회 (관리자)
export const fetchKakaoStatus = () =>
  authFetch(`${BASE}/kakao/status`).then(r => r.json());

// 미연동 직원 독려 메시지 발송 (관리자)
export const sendKakaoNudge = () =>
  authFetch(`${BASE}/kakao/nudge`, { method: 'POST' }).then(r => r.json());

// 특정 사원 카카오 테스트 메시지 발송 (관리자)
export const sendKakaoTestMessage = (empno) =>
  authFetch(`${BASE}/kakao/test/${empno}`, { method: 'POST' }).then(r => r.json());

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
