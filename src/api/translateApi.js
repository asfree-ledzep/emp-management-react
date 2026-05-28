import { authFetch } from './apiClient';

/**
 * 네이버 파파고 번역 API (백엔드 프록시)
 * @param {string} text   - 번역할 한국어 텍스트
 * @param {string} target - 대상 언어: 'en' | 'zh-CN' | 'ja'
 * @returns {Promise<{ translatedText?: string, error?: string, message?: string }>}
 */
export async function translateText(text, target = 'en') {
  const res = await authFetch('/api/translate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, target }),
    noAutoLogout: true,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
