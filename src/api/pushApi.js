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
