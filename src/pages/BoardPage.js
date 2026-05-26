import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../api/apiClient';

/* ── 파일 업로드 ── */
async function uploadBoardFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch('/api/board/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('업로드 실패');
  return res.json(); // { url, fileName }
}

export default function BoardPage({ empno, darkMode }) {
  const username = sessionStorage.getItem('username') || '알 수 없음';
  const deptno   = sessionStorage.getItem('deptno');
  const myEmpno  = Number(empno);

  const dk = darkMode;
  const C = {
    bg:         dk ? '#0f172a' : '#f8fafc',
    card:       dk ? '#1e293b' : '#ffffff',
    cardHover:  dk ? '#263548' : '#f0f7ff',
    border:     dk ? '#334155' : '#e2e8f0',
    text:       dk ? '#e2e8f0' : '#1e293b',
    sub:        dk ? '#94a3b8' : '#64748b',
    tabActive:  dk ? '#3b82f6' : '#2563eb',
    tabBg:      dk ? '#1e293b' : '#ffffff',
    inputBg:    dk ? '#0f172a' : '#ffffff',
    inputBord:  dk ? '#475569' : '#cbd5e1',
    overlayBg:  'rgba(0,0,0,0.55)',
    globalColor:'#059669',
    deptColor:  '#0891b2',
  };

  const [tab,       setTab]       = useState('global'); // 'global' | 'dept'
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState(null);   // 상세보기 게시글
  const [showWrite, setShowWrite] = useState(false);  // 글쓰기 모달
  const [dragOver,  setDragOver]  = useState(false);

  // 댓글 상태
  const [comments,     setComments]     = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // 글쓰기 폼 상태
  const [wTitle,    setWTitle]    = useState('');
  const [wContent,  setWContent]  = useState('');
  const [wFile,     setWFile]     = useState(null);   // File 객체
  const [wFileUploading, setWFileUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');

  const fileInputRef    = useRef(null);
  const commentBotRef   = useRef(null);
  const commentInputRef = useRef(null);
  const accentColor = tab === 'global' ? C.globalColor : C.deptColor;

  /* ── @멘션 하이라이트 렌더 ── */
  const renderCommentContent = (text) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      /^@\S+/.test(part)
        ? <span key={i} style={{ color: accentColor, fontWeight: 700 }}>{part}</span>
        : part
    );
  };

  /* ── 답글 버튼 클릭 → @이름 삽입 + 포커스 ── */
  const handleReply = (authorName) => {
    const mention = `@${authorName} `;
    setCommentInput(prev =>
      prev.startsWith('@') ? mention : mention + prev
    );
    commentInputRef.current?.focus();
  };

  /* ── 목록 로드 ── */
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'global'
        ? '/api/board/global'
        : `/api/board/dept?deptno=${deptno}`;
      const res  = await authFetch(url);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    finally  { setLoading(false); }
  }, [tab, deptno]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* ── 댓글 로드 ── */
  const loadComments = useCallback(async (postId) => {
    setCommentLoading(true);
    try {
      const res  = await authFetch(`/api/board/comments?postId=${postId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { setComments([]); }
    finally  { setCommentLoading(false); }
  }, []);

  /* ── 게시글 클릭 → 상세보기 + 댓글 로드 ── */
  const openDetail = (post) => {
    setSelected(post);
    setCommentInput('');
    setComments([]);
    loadComments(post.postId);
  };

  /* ── 댓글 등록 ── */
  const submitComment = async () => {
    if (!commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await authFetch('/api/board/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId:     String(selected.postId),
          authorName: username,
          content:    commentInput.trim(),
        }),
      });
      setCommentInput('');
      await loadComments(selected.postId);
      setTimeout(() => commentBotRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ }
    finally { setCommentSubmitting(false); }
  };

  /* ── 댓글 삭제 ── */
  const deleteComment = async (commentId) => {
    try {
      const res = await authFetch(`/api/board/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) { alert('삭제 권한이 없습니다.'); return; }
      await loadComments(selected.postId);
    } catch { /* ignore */ }
  };

  /* ── 글쓰기 모달 열기/초기화 ── */
  const openWrite = () => {
    setWTitle(''); setWContent(''); setWFile(null);
    setError(''); setShowWrite(true);
  };

  /* ── 파일 드래그앤드롭 (글쓰기 모달) ── */
  const handleWriteDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setWFile(f);
  }, []);

  /* ── 글 작성 제출 ── */
  const handleSubmit = async () => {
    if (!wTitle.trim())   { setError('제목을 입력해 주세요.'); return; }
    if (!wContent.trim()) { setError('내용을 입력해 주세요.'); return; }
    setSubmitting(true); setError('');
    try {
      let fileUrl  = null;
      let fileName = null;
      if (wFile) {
        setWFileUploading(true);
        const uploaded = await uploadBoardFile(wFile);
        fileUrl  = uploaded.url;
        fileName = uploaded.fileName;
        setWFileUploading(false);
      }
      const endpoint = tab === 'global' ? '/api/board/global' : '/api/board/dept';
      const body = {
        authorName: username,
        title:      wTitle.trim(),
        content:    wContent.trim(),
        fileUrl,
        fileName,
        ...(tab === 'dept' && { deptno: String(deptno) }),
      };
      const res = await authFetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error('저장 실패');
      setShowWrite(false);
      loadPosts();
    } catch (e) {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      setWFileUploading(false);
    }
  };

  /* ── 글 삭제 ── */
  const handleDelete = async (postId) => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    const endpoint = tab === 'global'
      ? `/api/board/global/${postId}`
      : `/api/board/dept/${postId}`;
    try {
      const res = await authFetch(endpoint, { method: 'DELETE' });
      if (!res.ok) { alert('삭제 권한이 없습니다.'); return; }
      setSelected(null);
      loadPosts();
    } catch { alert('삭제 중 오류가 발생했습니다.'); }
  };

  /* ── 파일 다운로드 URL ── */
  const downloadUrl = (url) => `/api/board/download?url=${encodeURIComponent(url)}`;

  /* ── 부서 탭 접근 제한 ── */
  const deptRestricted = tab === 'dept' && !deptno;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto', color: C.text }}>

      {/* 탭 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'global', label: '🌐 전체 게시판', color: C.globalColor },
          { key: 'dept',   label: '🏢 부서 게시판', color: C.deptColor   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px', borderRadius: 20, fontWeight: 700,
            fontSize: '0.88rem', cursor: 'pointer', border: 'none',
            background: tab === t.key ? t.color : (dk ? '#1e293b' : '#f1f5f9'),
            color:      tab === t.key ? '#fff'   : C.sub,
            boxShadow:  tab === t.key ? `0 2px 10px ${t.color}55` : 'none',
            transition: 'all 0.18s',
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {!deptRestricted && (
          <button onClick={openWrite} style={{
            padding: '8px 18px', borderRadius: 20, fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer', border: 'none',
            background: accentColor, color: '#fff',
            boxShadow: `0 2px 10px ${accentColor}55`,
          }}>✏️ 글쓰기</button>
        )}
      </div>

      {/* 부서 정보 없을 때 */}
      {deptRestricted && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: C.sub,
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        }}>
          ⚠️ 부서 정보가 없습니다. 다시 로그인해 주세요.
        </div>
      )}

      {/* 로딩 */}
      {loading && !deptRestricted && (
        <div style={{ textAlign: 'center', padding: 40, color: C.sub }}>불러오는 중...</div>
      )}

      {/* 빈 목록 */}
      {!loading && !deptRestricted && posts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: C.sub,
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>
            {tab === 'global' ? '🌐' : '🏢'}
          </div>
          아직 게시글이 없습니다.<br />
          <span style={{ fontSize: 13 }}>첫 번째 글을 작성해 보세요!</span>
        </div>
      )}

      {/* 게시글 목록 */}
      {!loading && !deptRestricted && posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map((post, idx) => (
            <div key={post.postId}
              onClick={() => openDetail(post)}
              style={{
                background: C.card, borderRadius: 10,
                border: `1px solid ${C.border}`,
                padding: '14px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.cardHover;
                e.currentTarget.style.boxShadow  = `0 2px 12px ${accentColor}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.card;
                e.currentTarget.style.boxShadow  = 'none';
              }}
            >
              {/* 번호 */}
              <div style={{
                minWidth: 30, textAlign: 'center',
                fontSize: '0.75rem', color: C.sub, fontWeight: 600,
              }}>{posts.length - idx}</div>

              {/* 제목 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.92rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {post.fileName && <span title="첨부파일 있음">📎</span>}
                  {post.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.sub, marginTop: 3 }}>
                  {post.authorName} · {post.createdAt}
                </div>
              </div>

              {/* 작성자 본인 삭제 */}
              {post.empno === myEmpno && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(post.postId); }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none',
                    background: '#fef2f2', color: '#ef4444',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}>삭제</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 상세보기 모달 ── */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: C.overlayBg, zIndex: 3000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3001, width: 'min(680px, 94vw)', maxHeight: '82vh',
            background: C.card, borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* 헤더 */}
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              background: dk ? '#1e293b' : '#f8fafc', flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <div style={{
                  fontWeight: 700, fontSize: '1rem', color: C.text,
                  wordBreak: 'break-word', lineHeight: 1.4,
                }}>{selected.title}</div>
                <div style={{ fontSize: '0.75rem', color: C.sub, marginTop: 5 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                    background: tab === 'global' ? '#ecfdf5' : '#e0f2fe',
                    color: accentColor, fontWeight: 700, fontSize: '0.7rem', marginRight: 8,
                  }}>
                    {tab === 'global' ? '🌐 전체' : '🏢 부서'}
                  </span>
                  {selected.authorName} · {selected.createdAt}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {selected.empno === myEmpno && (
                  <button onClick={() => handleDelete(selected.postId)} style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none',
                    background: '#fef2f2', color: '#ef4444',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  }}>🗑 삭제</button>
                )}
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.sub, fontSize: '1.2rem', lineHeight: 1, padding: 4,
                }}>✕</button>
              </div>
            </div>

            {/* 내용 */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              fontSize: '0.88rem', lineHeight: 1.8, color: C.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {selected.content || <span style={{ color: C.sub }}>(내용 없음)</span>}
            </div>

            {/* 첨부파일 */}
            {selected.fileUrl && (
              <div style={{
                padding: '12px 20px', borderTop: `1px solid ${C.border}`,
                background: dk ? '#0f172a' : '#f8fafc', flexShrink: 0,
              }}>
                <a href={downloadUrl(selected.fileUrl)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 8,
                  background: dk ? '#1e293b' : '#f1f5f9',
                  border: `1px solid ${C.border}`,
                  color: accentColor, textDecoration: 'none', fontWeight: 600,
                  fontSize: '0.82rem',
                }}>
                  <span>📎</span>
                  <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.fileName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: C.sub }}>다운로드</span>
                </a>
              </div>
            )}

            {/* ── 댓글 섹션 ── */}
            <div style={{
              borderTop: `1px solid ${C.border}`,
              background: dk ? '#0f172a' : '#f8fafc',
              flexShrink: 0, maxHeight: 320, display: 'flex', flexDirection: 'column',
            }}>
              {/* 댓글 헤더 */}
              <div style={{
                padding: '10px 20px 6px', fontSize: '0.8rem',
                fontWeight: 700, color: C.sub, flexShrink: 0,
              }}>
                💬 댓글 {comments.length > 0 ? `(${comments.length})` : ''}
              </div>

              {/* 댓글 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
                {commentLoading && (
                  <div style={{ fontSize: '0.78rem', color: C.sub, padding: '8px 0' }}>불러오는 중...</div>
                )}
                {!commentLoading && comments.length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: C.sub, padding: '8px 0' }}>
                    첫 번째 댓글을 남겨보세요.
                  </div>
                )}
                {comments.map(c => (
                  <div key={c.commentId} style={{
                    padding: '8px 0', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    {/* 아바타 */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                    }}>{c.authorName?.charAt(0)}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: C.text }}>
                          {c.authorName}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: C.sub }}>{c.createdAt}</span>
                        {/* 답글 버튼 */}
                        <button onClick={() => handleReply(c.authorName)} style={{
                          padding: '1px 7px', borderRadius: 6, border: 'none',
                          background: dk ? '#1e3a2c' : '#ecfdf5',
                          color: accentColor, fontSize: '0.65rem', fontWeight: 700,
                          cursor: 'pointer',
                        }}>↩ 답글</button>
                        {c.empno === myEmpno && (
                          <button onClick={() => deleteComment(c.commentId)} style={{
                            marginLeft: 'auto', padding: '1px 7px', borderRadius: 6,
                            border: 'none', background: '#fef2f2', color: '#ef4444',
                            fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                          }}>삭제</button>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.82rem', color: C.text, lineHeight: 1.5,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>{renderCommentContent(c.content)}</div>
                    </div>
                  </div>
                ))}
                <div ref={commentBotRef} />
              </div>

              {/* 댓글 입력창 */}
              <div style={{
                padding: '10px 20px', borderTop: `1px solid ${C.border}`,
                display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
              }}>
                <textarea
                  ref={commentInputRef}
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
                  }}
                  placeholder="댓글 입력 (Enter 등록 · Shift+Enter 줄바꿈) — 답글 버튼으로 @멘션"
                  rows={1}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 20,
                    border: `1.5px solid ${C.inputBord}`, outline: 'none',
                    background: C.inputBg, color: C.text, fontSize: '0.82rem',
                    resize: 'none', lineHeight: 1.4, maxHeight: 72,
                    overflowY: 'auto', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={submitComment}
                  disabled={!commentInput.trim() || commentSubmitting}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: commentInput.trim() && !commentSubmitting ? accentColor : '#e2e8f0',
                    color: commentInput.trim() && !commentSubmitting ? '#fff' : '#9ca3af',
                    cursor: commentInput.trim() && !commentSubmitting ? 'pointer' : 'default',
                    fontSize: '0.9rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>▶</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 글쓰기 모달 ── */}
      {showWrite && (
        <>
          <div onClick={() => setShowWrite(false)}
            style={{ position: 'fixed', inset: 0, background: C.overlayBg, zIndex: 3000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3001, width: 'min(600px, 94vw)',
            background: C.card, borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* 헤더 */}
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: dk ? '#1e293b' : '#f8fafc',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: accentColor }}>
                {tab === 'global' ? '🌐 전체 게시글 작성' : '🏢 부서 게시글 작성'}
              </span>
              <button onClick={() => setShowWrite(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.sub, fontSize: '1.2rem', lineHeight: 1,
              }}>✕</button>
            </div>

            {/* 폼 */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 제목 */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.sub, display: 'block', marginBottom: 6 }}>
                  제목 *
                </label>
                <input
                  value={wTitle}
                  onChange={e => setWTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  maxLength={200}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: `1.5px solid ${C.inputBord}`, outline: 'none',
                    background: C.inputBg, color: C.text, fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 내용 */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.sub, display: 'block', marginBottom: 6 }}>
                  내용 *
                </label>
                <textarea
                  value={wContent}
                  onChange={e => setWContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={7}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: `1.5px solid ${C.inputBord}`, outline: 'none',
                    background: C.inputBg, color: C.text, fontSize: '0.88rem',
                    resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 파일 첨부 (드래그앤드롭) */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.sub, display: 'block', marginBottom: 6 }}>
                  파일 첨부 (선택)
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleWriteDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? accentColor : C.inputBord}`,
                    borderRadius: 8, padding: '16px', textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: dragOver
                      ? (tab === 'global' ? '#ecfdf5' : '#e0f2fe')
                      : (dk ? '#0f172a' : '#f8fafc'),
                    color: C.sub, fontSize: '0.82rem',
                  }}
                >
                  {wFile
                    ? <span style={{ color: accentColor, fontWeight: 600 }}>📎 {wFile.name}</span>
                    : <span>파일을 여기에 드래그하거나 클릭하여 선택<br />
                        <span style={{ fontSize: '0.72rem' }}>모든 파일 형식 지원</span>
                      </span>
                  }
                </div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  onChange={e => setWFile(e.target.files?.[0] || null)} />
                {wFile && (
                  <button onClick={() => setWFile(null)}
                    style={{ marginTop: 6, fontSize: '0.72rem', color: '#ef4444',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ✕ 파일 제거
                  </button>
                )}
              </div>

              {/* 오류 메시지 */}
              {error && (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>{error}</div>
              )}

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={() => setShowWrite(false)} style={{
                  padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: 'none', color: C.sub, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
                }}>취소</button>
                <button onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '9px 24px', borderRadius: 8, border: 'none',
                    background: submitting ? '#94a3b8' : accentColor,
                    color: '#fff', fontSize: '0.85rem', cursor: submitting ? 'default' : 'pointer',
                    fontWeight: 700,
                  }}>
                  {wFileUploading ? '파일 업로드 중...' : submitting ? '저장 중...' : '등록'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
