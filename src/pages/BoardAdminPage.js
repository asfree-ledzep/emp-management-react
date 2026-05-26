import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/apiClient';

export default function BoardAdminPage({ darkMode, onDashboard }) {
  const dk = darkMode;
  const C = {
    bg:     dk ? '#0f172a' : '#f8fafc',
    card:   dk ? '#1e293b' : '#ffffff',
    border: dk ? '#334155' : '#e2e8f0',
    text:   dk ? '#e2e8f0' : '#1e293b',
    sub:    dk ? '#94a3b8' : '#64748b',
    inputBg:dk ? '#0f172a' : '#ffffff',
    inputBord: dk ? '#475569' : '#cbd5e1',
  };

  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState('all');   // 'all' | 'global' | 'dept'
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/board/admin');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleDelete = async (postId) => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await authFetch(`/api/board/admin/${postId}`, { method: 'DELETE' });
      if (selected?.postId === postId) setSelected(null);
      loadPosts();
    } catch { alert('삭제 실패'); }
  };

  const filtered = posts.filter(p => {
    const matchType = filter === 'all' || (filter === 'global' ? !p.deptno : !!p.deptno);
    const matchSearch = !search || p.title?.includes(search) || p.authorName?.includes(search);
    return matchType && matchSearch;
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto', color: C.text }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onDashboard} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.sub, fontSize: '0.85rem', padding: 0,
        }}>← 대시보드</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: C.text }}>
          📌 게시판 관리
        </h2>
        <span style={{
          background: '#4f46e5', color: '#fff',
          borderRadius: 12, padding: '2px 10px',
          fontSize: '0.75rem', fontWeight: 700,
        }}>{posts.length}건</span>
      </div>

      {/* 필터 & 검색 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all',    label: '전체' },
          { key: 'global', label: '🌐 전체 게시판' },
          { key: 'dept',   label: '🏢 부서 게시판' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none',
            background: filter === f.key ? '#4f46e5' : (dk ? '#1e293b' : '#f1f5f9'),
            color: filter === f.key ? '#fff' : C.sub,
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
          }}>{f.label}</button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="제목 / 작성자 검색..."
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${C.border}`, outline: 'none',
            background: C.inputBg, color: C.text, fontSize: '0.82rem', width: 200,
          }}
        />
      </div>

      {/* 목록 */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: C.sub }}>불러오는 중...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: C.sub }}>게시글이 없습니다.</div>
      )}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 80px 1fr 90px 140px 70px',
            gap: 8, padding: '8px 16px',
            fontSize: '0.75rem', fontWeight: 700, color: C.sub,
            borderBottom: `2px solid ${C.border}`,
          }}>
            <span>번호</span><span>유형</span><span>제목</span>
            <span>작성자</span><span>작성일</span><span>관리</span>
          </div>
          {filtered.map((post, idx) => (
            <div key={post.postId} style={{
              display: 'grid', gridTemplateColumns: '60px 80px 1fr 90px 140px 70px',
              gap: 8, padding: '10px 16px',
              background: C.card, borderRadius: 8,
              border: `1px solid ${C.border}`,
              alignItems: 'center', fontSize: '0.83rem',
            }}>
              <span style={{ color: C.sub, fontSize: '0.72rem' }}>{filtered.length - idx}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                background: post.deptno ? '#e0f2fe' : '#ecfdf5',
                color: post.deptno ? '#0891b2' : '#059669',
              }}>{post.deptno ? '🏢 부서' : '🌐 전체'}</span>
              <span
                onClick={() => setSelected(post)}
                style={{
                  fontWeight: 600, cursor: 'pointer', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {post.fileName && <span title="첨부파일">📎</span>}
                <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>{post.title}</span>
              </span>
              <span style={{ color: C.sub, fontSize: '0.78rem' }}>{post.authorName}</span>
              <span style={{ color: C.sub, fontSize: '0.75rem' }}>{post.createdAt}</span>
              <button onClick={() => handleDelete(post.postId)} style={{
                padding: '3px 10px', borderRadius: 6, border: 'none',
                background: '#fef2f2', color: '#ef4444',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              }}>삭제</button>
            </div>
          ))}
        </div>
      )}

      {/* 상세보기 모달 */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 3001, width: 'min(640px, 94vw)', maxHeight: '80vh',
            background: C.card, borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              background: dk ? '#1e293b' : '#f8fafc',
            }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', wordBreak: 'break-word', color: C.text }}>
                  {selected.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.sub, marginTop: 4 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                    background: selected.deptno ? '#e0f2fe' : '#ecfdf5',
                    color: selected.deptno ? '#0891b2' : '#059669',
                    fontWeight: 700, fontSize: '0.7rem', marginRight: 8,
                  }}>{selected.deptno ? '🏢 부서' : '🌐 전체'}</span>
                  {selected.authorName} · {selected.createdAt}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleDelete(selected.postId)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: '#fef2f2', color: '#ef4444',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}>🗑 삭제</button>
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.sub, fontSize: '1.2rem', lineHeight: 1, padding: 4,
                }}>✕</button>
              </div>
            </div>
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              fontSize: '0.88rem', lineHeight: 1.8, color: C.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {selected.content || <span style={{ color: C.sub }}>(내용 없음)</span>}
            </div>
            {selected.fileUrl && (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, background: dk ? '#0f172a' : '#f8fafc' }}>
                <a href={`/api/board/download?url=${encodeURIComponent(selected.fileUrl)}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 8,
                    background: dk ? '#1e293b' : '#f1f5f9',
                    border: `1px solid ${C.border}`,
                    color: '#4f46e5', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem',
                  }}>
                  📎 {selected.fileName}
                  <span style={{ fontSize: '0.72rem', color: C.sub }}>다운로드</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
