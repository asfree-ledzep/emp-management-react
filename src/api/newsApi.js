import { authFetch } from './apiClient';

/**
 * 네이버 뉴스 검색 (백엔드 프록시)
 * @param {string} query   - 검색어
 * @param {number} display - 가져올 건수 (기본 5)
 */
export async function fetchNews(query = 'IT 뉴스', display = 5) {
  const params = new URLSearchParams({ query, display });
  const res = await authFetch(`/api/news?${params}`, { noAutoLogout: true });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
