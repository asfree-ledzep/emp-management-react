import { authFetch } from './apiClient';

const BASE = process.env.REACT_APP_API_URL || '';

export const subscribePush = (subscription) =>
  authFetch(`${BASE}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

export const unsubscribePush = (endpoint) =>
  authFetch(`${BASE}/api/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

export const testPush = (title, body) =>
  authFetch(`${BASE}/api/push/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
