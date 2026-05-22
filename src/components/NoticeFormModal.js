import React, { useState } from 'react';
import { createNotice } from '../api/noticeApi';

function NoticeFormModal({ onClose, onSaved }) {
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createNotice({ title, content });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || '등록 실패');
      }
    } catch (e) {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 1000
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: '12px', padding: '32px',
          width: '90%', maxWidth: '560px'
        }}
      >
        <h3 style={{ margin: '0 0 24px' }}>📢 공지사항 작성</h3>

        {error && (
          <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>제목</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>내용</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            rows={6}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box'
            }}
          />
        </div>

        <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px' }}>
          ※ 등록 시 카카오 연동된 사원에게 카카오톡 메시지가 발송됩니다.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', background: '#6b7280', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '9px 20px', background: loading ? '#a5b4fc' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600
            }}
          >
            {loading ? '발송 중...' : '등록 및 발송'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoticeFormModal;
