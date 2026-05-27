import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/apiClient';

export default function MessageFloatButton({ darkMode = false }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread,  setUnread]  = useState(0);
  const dk = darkMode;

  const loadUnread = useCallback(() => {
    authFetch('/api/msg/unread-count', { noAutoLogout: true })
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setUnread(d.count || 0))
      .catch(() => {});
  }, []);

  const loadMsgs = useCallback(() => {
    setLoading(true);
    authFetch('/api/msg/inbox', { noAutoLogout: true })
      .then(r => r.ok ? r.json() : [])
      .then(d => setMsgs(Array.isArray(d) ? d.slice(0, 10) : []))
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  }, []);

  // 마운트 시 미읽 수 폴링
  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => clearInterval(t);
  }, [loadUnread]);

  // 패널 열릴 때 메시지 로드
  useEffect(() => {
    if (open) loadMsgs();
  }, [open, loadMsgs]);

  // 쪽지 변경 이벤트 (MessagePage에서 dispatch 가능)
  useEffect(() => {
    window.addEventListener('msg:updated', loadUnread);
    return () => window.removeEventListener('msg:updated', loadUnread);
  }, [loadUnread]);

  // 쪽지 클릭: 읽음 처리 + 쪽지함 페이지로 이동
  const handleMsgClick = async (m) => {
    const msgId = m.msgId;
    // 패널 닫기
    setOpen(false);
    // EmployeeLayout에 쪽지함 이동 요청
    window.dispatchEvent(new CustomEvent('nav:message', { detail: { msgId } }));
    // 미읽음이면 읽음 처리
    const isUnread = !m.isRead && !m.read;
    if (isUnread) {
      try {
        await authFetch(`/api/msg/${msgId}/read`, { method: 'POST', noAutoLogout: true });
        loadUnread();
      } catch {}
    }
  };

  // 다크 팔레트
  const panel  = dk ? '#1e293b' : '#ffffff';
  const border = dk ? '#334155' : '#f3f4f6';
  const text   = dk ? '#e2e8f0' : '#374151';
  const muted  = dk ? '#64748b' : '#9ca3af';

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = now - dt;
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return dt.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* ── 미니 패널 ── */}
      {open && (
        <>
          {/* 오버레이 */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
          />

          {/* 패널 */}
          <div style={{
            position: 'fixed', bottom: 88, right: 228, zIndex: 2000,
            width: 300, maxHeight: 420,
            background: panel, borderRadius: 16,
            boxShadow: dk
              ? '0 8px 40px rgba(0,0,0,0.55)'
              : '0 8px 40px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'msgSlideUp 0.2s ease',
          }}>

            {/* 헤더 */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
                  ✉️ 쪽지함
                </div>
                <div style={{ color: '#ddd6fe', fontSize: '0.72rem', marginTop: 2 }}>
                  미읽음 {loading ? '…' : `${unread}건`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={e => { e.stopPropagation(); loadMsgs(); loadUnread(); }}
                  title="새로고침"
                  style={{
                    background: 'rgba(255,255,255,0.18)', border: 'none',
                    borderRadius: '50%', width: 26, height: 26,
                    color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >🔄</button>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>
            </div>

            {/* 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: '0.85rem' }}>
                  불러오는 중...
                </div>
              ) : msgs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📭</div>
                  받은 쪽지가 없습니다.
                </div>
              ) : (
                msgs.map((m, idx) => {
                  const isUnread = !m.isRead && !m.read;
                  return (
                    <div key={m.msgId || idx} style={{
                      padding: '10px 14px',
                      borderBottom: idx < msgs.length - 1 ? `1px solid ${border}` : 'none',
                      cursor: 'pointer',
                      background: isUnread
                        ? (dk ? 'rgba(124,58,237,0.1)' : '#faf5ff')
                        : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => handleMsgClick(m)}
                    onMouseEnter={e => e.currentTarget.style.background = dk ? 'rgba(124,58,237,0.15)' : '#f3e8ff'}
                    onMouseLeave={e => e.currentTarget.style.background = isUnread ? (dk ? 'rgba(124,58,237,0.1)' : '#faf5ff') : 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            {isUnread && (
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#a855f7', flexShrink: 0,
                                display: 'inline-block',
                              }} />
                            )}
                            <span style={{
                              fontSize: '0.83rem', fontWeight: isUnread ? 700 : 500,
                              color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {m.subject || m.title || '(제목 없음)'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.73rem', color: muted }}>
                            From: {m.senderName || m.sender || '알 수 없음'}
                          </div>
                          {m.content && (
                            <div style={{
                              fontSize: '0.75rem', color: muted, marginTop: 2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {m.content}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: muted, flexShrink: 0, marginTop: 2 }}>
                          {fmtDate(m.createdAt || m.sentAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 푸터 */}
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${border}`,
              padding: '8px 14px',
              fontSize: '0.75rem', color: muted,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>받은 쪽지 {msgs.length}건</span>
              <span style={{ color: '#a855f7', fontWeight: 600 }}>미읽음 {unread}건</span>
            </div>
          </div>
        </>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="쪽지함"
        style={{
          position: 'fixed', bottom: 24, right: 228, zIndex: 1998,
          width: 56, height: 56, borderRadius: '50%',
          background: open
            ? '#6b7280'
            : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.3rem',
          boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: open ? 'rotate(15deg) scale(0.95)' : 'none',
        }}
      >
        {open ? '✕' : '✉️'}

        {/* 미읽음 배지 */}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
            width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <style>{`
        @keyframes msgSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
