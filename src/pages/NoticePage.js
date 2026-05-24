import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchNotices, deleteNotice,
  markNoticeRead, fetchNoticeReadSummary,
} from '../api/noticeApi';
import NoticeFormModal from '../components/NoticeFormModal';

function NoticePage({ isAdmin, onNavigateToList, empno }) {
  const [notices,     setNotices]     = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editNotice,  setEditNotice]  = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [readSummary, setReadSummary] = useState(null);   // 관리자 읽음 현황
  const [summaryTab,  setSummaryTab]  = useState('read'); // 'read' | 'unread'
  const [loadSummary, setLoadSummary] = useState(false);
  const [loading,     setLoading]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotices()
      .then(setNotices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('공지사항을 삭제하시겠습니까?')) return;
    await deleteNotice(id);
    load();
  };

  // 공지 클릭 처리
  const handleSelect = async (n) => {
    setSelected(n);
    setReadSummary(null);
    setSummaryTab('read');

    if (isAdmin) {
      // 관리자: 읽음 현황 비동기 로드
      setLoadSummary(true);
      fetchNoticeReadSummary(n.noticeId)
        .then(setReadSummary)
        .catch(console.error)
        .finally(() => setLoadSummary(false));
    } else {
      // 사원: 읽음 처리 + 로컬 상태 업데이트
      if (!n.isRead) {
        markNoticeRead(n.noticeId).catch(console.error);
        setNotices(prev =>
          prev.map(item =>
            item.noticeId === n.noticeId ? { ...item, isRead: true } : item
          )
        );
        setSelected({ ...n, isRead: true });
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return String(dateStr).substring(0, 10);
  };

  const unreadCount = notices.filter(n => n.isRead === false).length;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          📢 공지사항
          {!isAdmin && unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', fontSize: '0.72rem',
              fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onNavigateToList && (
            <button onClick={onNavigateToList} style={btnStyle('#6b7280')}>
              {isAdmin ? '🏠 대시보드' : '← 돌아가기'}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowForm(true)} style={btnStyle('#4f46e5')}>
              + 공지 작성
            </button>
          )}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <p style={{ color: '#888' }}>불러오는 중...</p>
      ) : notices.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', marginTop: '60px' }}>등록된 공지사항이 없습니다.</p>
      ) : (
        <div>
          {notices.map(n => (
            <div
              key={n.noticeId}
              onClick={() => handleSelect(n)}
              style={{
                background: '#fff',
                border: `1px solid ${!isAdmin && n.isRead === false ? '#bfdbfe' : '#e5e7eb'}`,
                borderLeft: !isAdmin && n.isRead === false ? '4px solid #3b82f6' : '4px solid transparent',
                borderRadius: '8px',
                padding: '14px 20px',
                marginBottom: '10px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {/* 사원: 미읽음 NEW 뱃지 */}
                  {!isAdmin && n.isRead === false && (
                    <span style={{
                      background: '#dbeafe', color: '#1d4ed8',
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '1px 6px', borderRadius: 10,
                      flexShrink: 0,
                    }}>NEW</span>
                  )}
                  <div style={{
                    fontWeight: !isAdmin && n.isRead === false ? 700 : 600,
                    fontSize: '1rem',
                    color: !isAdmin && n.isRead ? '#6b7280' : '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.title}
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#888' }}>
                  {n.createdBy} · {formatDate(n.createdAt)}
                  {/* 관리자: 읽음 수 뱃지 */}
                  {isAdmin && n.readCount != null && (
                    <span style={{
                      marginLeft: 10,
                      background: n.readCount > 0 ? '#dcfce7' : '#f3f4f6',
                      color: n.readCount > 0 ? '#15803d' : '#9ca3af',
                      fontSize: '0.72rem', fontWeight: 600,
                      padding: '1px 8px', borderRadius: 10,
                    }}>
                      👁 읽음 {n.readCount}명
                    </span>
                  )}
                </div>
              </div>

              {/* 관리자: 수정/삭제 버튼 */}
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', marginLeft: 12, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); setEditNotice(n); }}
                    style={smallBtn('#4f46e5')}>수정</button>
                  <button onClick={(e) => handleDelete(e, n.noticeId)}
                    style={smallBtn('#ef4444')}>삭제</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '12px', padding: '32px',
              width: '90%', maxWidth: '640px', maxHeight: '85vh',
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0,
            }}
          >
            {/* 제목 + 메타 */}
            <h3 style={{ margin: '0 0 6px' }}>{selected.title}</h3>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 20px' }}>
              {selected.createdBy} · {formatDate(selected.createdAt)}
            </p>
            <hr style={{ margin: '0 0 20px', border: 'none', borderTop: '1px solid #e5e7eb' }} />

            {/* 본문 */}
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: '0 0 28px' }}>
              {selected.content}
            </p>

            {/* 관리자: 읽음 현황 */}
            {isAdmin && (
              <div style={{
                border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
              }}>
                <div style={{
                  background: '#f9fafb', padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>
                    👁 읽음 현황
                    {readSummary && (
                      <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                        {readSummary.readCount} / {readSummary.totalEmp}명
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['read', 'unread'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSummaryTab(tab)}
                        style={{
                          padding: '4px 12px', fontSize: '0.78rem',
                          borderRadius: 20, cursor: 'pointer', border: 'none', fontWeight: 600,
                          background: summaryTab === tab ? '#4f46e5' : '#e5e7eb',
                          color: summaryTab === tab ? '#fff' : '#6b7280',
                        }}
                      >
                        {tab === 'read' ? '읽음' : '미읽음'}
                        {readSummary && (
                          <span style={{ marginLeft: 4, opacity: 0.85 }}>
                            ({tab === 'read' ? readSummary.readCount : readSummary.unreaders?.length ?? 0})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', minHeight: 80 }}>
                  {loadSummary ? (
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', margin: '20px 0' }}>
                      불러오는 중...
                    </p>
                  ) : !readSummary ? null : (
                    <>
                      {summaryTab === 'read' && (
                        readSummary.readers.length === 0 ? (
                          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', margin: '16px 0' }}>
                            아직 읽은 사원이 없습니다
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {readSummary.readers.map((r, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#f0fdf4', border: '1px solid #bbf7d0',
                                borderRadius: 20, padding: '4px 12px', fontSize: '0.82rem',
                              }}>
                                <span style={{ color: '#15803d', fontWeight: 600 }}>{r.ename}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                                  {r.readAt ? String(r.readAt).substring(0, 16).replace('T', ' ') : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                      {summaryTab === 'unread' && (
                        readSummary.unreaders.length === 0 ? (
                          <p style={{ color: '#15803d', fontSize: '0.85rem', textAlign: 'center', margin: '16px 0' }}>
                            ✅ 모든 사원이 읽었습니다
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {readSummary.unreaders.map((r, i) => (
                              <div key={i} style={{
                                background: '#fef3c7', border: '1px solid #fcd34d',
                                borderRadius: 20, padding: '4px 12px',
                                fontSize: '0.82rem', color: '#92400e', fontWeight: 600,
                              }}>
                                {r.ename}
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button onClick={() => setSelected(null)} style={btnStyle('#6b7280')}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showForm && (
        <NoticeFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {/* 수정 모달 */}
      {editNotice && (
        <NoticeFormModal
          notice={editNotice}
          onClose={() => setEditNotice(null)}
          onSaved={() => { setEditNotice(null); load(); }}
        />
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  padding: '8px 18px', background: bg, color: '#fff',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
});

const smallBtn = (bg) => ({
  padding: '4px 12px', background: bg, color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
});

export default NoticePage;
