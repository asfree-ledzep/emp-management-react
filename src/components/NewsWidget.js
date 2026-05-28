import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNews } from '../api/newsApi';
import { useLang } from '../i18n/LangContext';

/**
 * 업계 뉴스 피드 위젯 (사원 전용)
 *
 * props:
 *   darkMode  - boolean
 *   defaultQuery - 기본 검색어 (없으면 localStorage 또는 'IT 뉴스')
 */
export default function NewsWidget({ darkMode = false, defaultQuery }) {
  const { t } = useLang();
  const dk = darkMode;

  const [query, setQuery] = useState(
    () => localStorage.getItem('newsQuery') || defaultQuery || 'IT 뉴스'
  );
  const [inputVal, setInputVal] = useState(query);
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [lastAt,  setLastAt]  = useState(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback((q) => {
    const keyword = q ?? query;
    setLoading(true);
    setError(null);
    fetchNews(keyword, 5)
      .then(data => {
        if (data.error === 'API_KEY_NOT_SET') {
          setError('API_KEY_NOT_SET');
          setNews([]);
          return;
        }
        if (data.error === 'API_FORBIDDEN') {
          setError('API_FORBIDDEN');
          setNews([]);
          return;
        }
        if (data.error) {
          setError(data.message || data.error);
          setNews([]);
          return;
        }
        setNews(data.items || []);
        setLastAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    load();
    // 30분마다 자동 갱신
    const t = setInterval(() => load(), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const handleSearch = () => {
    const q = inputVal.trim() || 'IT 뉴스';
    setQuery(q);
    localStorage.setItem('newsQuery', q);
    load(q);
  };

  // 날짜 포맷 (RFC2822 → 간단 표시)
  const fmtDate = (pubDate) => {
    if (!pubDate) return '';
    try {
      const d = new Date(pubDate);
      const now = new Date();
      const diffMs = now - d;
      const diffH  = Math.floor(diffMs / 3600000);
      const diffD  = Math.floor(diffMs / 86400000);
      if (diffH < 1)  return '방금';
      if (diffH < 24) return `${diffH}시간 전`;
      if (diffD < 7)  return `${diffD}일 전`;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return '';
    }
  };

  // 스타일 변수
  const bg     = dk ? '#1e293b' : '#fff';
  const border = dk ? '#334155' : '#e2e8f0';
  const textM  = dk ? '#94a3b8' : '#64748b';
  const textD  = dk ? '#f1f5f9' : '#1e293b';
  const inputBg= dk ? '#0f172a' : '#f8fafc';
  const hoverBg= dk ? '#0f172a' : '#f8faff';
  const tagBg  = dk ? '#1e3a5f' : '#eff6ff';
  const tagTxt = dk ? '#93c5fd' : '#2563eb';

  return (
    <div style={{
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>📰</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: textD }}>
            {t('newsTitle')}
          </span>
          {lastAt && (
            <span style={{ fontSize: '0.65rem', color: textM }}>
              {lastAt} 조회
            </span>
          )}
        </div>

        {/* 검색 인풋 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: textM, flexShrink: 0 }}>
            {t('newsKeyword')}:
          </span>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="검색어 입력"
            style={{
              width: 130, fontSize: '0.78rem',
              border: `1px solid ${border}`, borderRadius: 6,
              padding: '4px 8px', outline: 'none',
              background: inputBg, color: textD,
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: '#4f46e5', color: '#fff', border: 'none',
              borderRadius: 6, padding: '4px 10px',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : t('newsSearch')}
          </button>
          <button
            onClick={() => load()}
            disabled={loading}
            title={t('newsRefresh')}
            style={{
              background: 'none', border: `1px solid ${border}`,
              borderRadius: 6, padding: '3px 7px',
              fontSize: '0.82rem', cursor: 'pointer', color: textM,
              opacity: loading ? 0.5 : 1,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* 현재 검색어 태그 */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          display: 'inline-block',
          background: tagBg, color: tagTxt,
          fontSize: '0.68rem', fontWeight: 700,
          borderRadius: 9999, padding: '2px 10px',
        }}>
          🔍 {query}
        </span>
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div style={{ color: textM, fontSize: '0.85rem', padding: '12px 0', textAlign: 'center' }}>
          ⏳ {t('newsLoading')}
        </div>
      ) : error === 'API_KEY_NOT_SET' ? (
        <div style={{
          background: dk ? '#1c1917' : '#fefce8',
          border: `1px solid ${dk ? '#713f12' : '#fde68a'}`,
          borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem',
        }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
            🔑 API 미설정
          </div>
          <div style={{ color: textM, lineHeight: 1.6 }}>
            {t('newsApiNotSet')}<br />
            <span style={{ fontSize: '0.72rem' }}>
              EB 환경변수: <code>NAVER_CLIENT_ID</code>, <code>NAVER_CLIENT_SECRET</code>
            </span>
          </div>
        </div>
      ) : error === 'API_FORBIDDEN' ? (
        <div style={{
          background: dk ? '#1c1917' : '#fefce8',
          border: `1px solid ${dk ? '#713f12' : '#fde68a'}`,
          borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem',
        }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
            🔑 API 인증 실패
          </div>
          <div style={{ color: textM, lineHeight: 1.6 }}>
            네이버 Client ID / Secret이 올바르지 않거나 검색 API 권한이 없습니다.<br />
            <span style={{ fontSize: '0.72rem' }}>
              developers.naver.com → 앱 관리 → 사용 API에 <b>검색</b> 포함 여부 확인
            </span>
          </div>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', fontSize: '0.82rem', padding: '8px 0' }}>
          ⚠ {t('newsError')} ({error})
        </div>
      ) : news.length === 0 ? (
        <div style={{ color: textM, fontSize: '0.85rem', padding: '8px 0', textAlign: 'center' }}>
          {t('newsEmpty')}
        </div>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(expanded ? news : news.slice(0, 1)).map((item, idx, arr) => (
              <li key={idx} style={{
                padding: '9px 0',
                borderBottom: idx < arr.length - 1 ? `1px solid ${border}` : 'none',
              }}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: textD,
                    padding: '2px 4px',
                    borderRadius: 6,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* 제목 */}
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 600,
                    color: textD, lineHeight: 1.4,
                    marginBottom: 3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.title}
                  </div>
                  {/* 설명 */}
                  {item.description && (
                    <div style={{
                      fontSize: '0.73rem', color: textM,
                      lineHeight: 1.5, marginBottom: 4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {item.description}
                    </div>
                  )}
                  {/* 출처 + 날짜 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.source && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        color: tagTxt, background: tagBg,
                        borderRadius: 9999, padding: '1px 6px',
                      }}>
                        {item.source}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: textM }}>
                      {fmtDate(item.pubDate)}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
          {/* 펼치기 / 접기 버튼 */}
          {news.length > 1 && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, width: '100%', marginTop: 8,
                background: 'none', border: `1px solid ${border}`,
                borderRadius: 8, padding: '5px 0',
                fontSize: '0.75rem', color: textM,
                cursor: 'pointer',
              }}
            >
              {expanded
                ? <>접기 <span style={{ fontSize: '0.7rem' }}>▲</span></>
                : <>뉴스 {news.length - 1}개 더보기 <span style={{ fontSize: '0.7rem' }}>▼</span></>
              }
            </button>
          )}
        </>
      )}
    </div>
  );
}
