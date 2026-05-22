import React, { useState, useEffect, useCallback } from 'react';
import { fetchNotices, deleteNotice } from '../api/noticeApi';
import NoticeFormModal from '../components/NoticeFormModal';

function NoticePage({ isAdmin, onNavigateToList }) {
  const [notices, setNotices]       = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return String(dateStr).substring(0, 10);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📢 공지사항</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigateToList && (
            <button
              onClick={onNavigateToList}
              style={{
                padding: '8px 18px', background: '#6b7280', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
              }}
            >
              🏠 대시보드
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '8px 18px', background: '#4f46e5', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
              }}
            >
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
              onClick={() => setSelected(n)}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                padding: '16px 20px', marginBottom: '12px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{n.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#888' }}>
                  {n.createdBy} · {formatDate(n.createdAt)}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => handleDelete(e, n.noticeId)}
                  style={{
                    padding: '4px 12px', background: '#ef4444', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '12px', padding: '32px',
              width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto'
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>{selected.title}</h3>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 20px' }}>
              {selected.createdBy} · {formatDate(selected.createdAt)}
            </p>
            <hr style={{ margin: '0 0 20px', border: 'none', borderTop: '1px solid #e5e7eb' }} />
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selected.content}</p>
            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '8px 20px', background: '#6b7280', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작성 모달 */}
      {showForm && (
        <NoticeFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

export default NoticePage;
