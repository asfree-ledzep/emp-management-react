import { authFetch } from './apiClient';

const BASE = '/api/faq';

// 전체 FAQ 목록 (관리자)
export const fetchFaqs = () =>
  authFetch(BASE).then(r => r.json());

// 챗봇 검색
export const searchFaq = (query) =>
  authFetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then(r => r.json());

// 등록
export const createFaq = (faq) =>
  authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(faq),
  });

// 수정
export const updateFaq = (id, faq) =>
  authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(faq),
  });

// 삭제
export const deleteFaq = (id) =>
  authFetch(`${BASE}/${id}`, { method: 'DELETE' });
