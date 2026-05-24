import { authFetch } from './apiClient';

const BASE = '/api';

export const subscribePush = (subscription) =>
  authFetch(`${BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

export const unsubscribePush = (endpoint) =>
  authFetch(`${BASE}/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

export const testPush = (title, body) =>
  authFetch(`${BASE}/push/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });

// 카카오 미연동 사원에게 연동 독려 푸시 발송 (관리자 전용)
export const sendPushNudgeKakao = () =>
  authFetch(`${BASE}/push/nudge-kakao`, { method: 'POST' }).then(r => r.json());
