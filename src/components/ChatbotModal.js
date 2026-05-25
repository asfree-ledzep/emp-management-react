import React, { useState, useRef, useEffect } from 'react';
import { searchFaq, fetchHolidaysByMonth } from '../api/faqApi';
import TeamChatModal from './TeamChatModal';

const QUICK = ['연차 일수', '급여일', '식비 한도', '출장비', '경조사 지원', '이번 달 휴무일'];

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 공휴일 관련 질문인지 감지
const isHolidayQuery = (q) =>
  /공휴일|휴무일|쉬는\s*날|휴일|빨간\s*날|쉬는날|선거일|선거\s*날|투표일|투표\s*날|노는\s*날|노는날/.test(q);

// 질문에서 대상 연/월 파싱
const parseTargetMonth = (q) => {
  const now = new Date();
  if (/다음\s*달|다음달/.test(q)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  const m = q.match(/(\d{1,2})\s*월/);
  if (m) return { year: now.getFullYear(), month: parseInt(m[1]) };
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

// 공휴일 목록 → 챗봇 응답 텍스트 변환
const formatHolidays = (year, month, list) => {
  if (!list || list.length === 0)
    return `📅 ${year}년 ${month}월에는 공휴일이 없습니다.`;
  const lines = list.map((h) => {
    const d = new Date(h.holidayDate);
    const day = DAYS_KO[d.getDay()];
    const md = h.holidayDate.slice(5); // MM-DD
    return `• ${md} (${day}) ${h.holidayName}`;
  });
  return `📅 ${year}년 ${month}월 공휴일 (${list.length}건)\n\n${lines.join('\n')}\n\n총 ${list.length}일 쉽니다.`;
};

const BOT_INTRO = {
  role: 'bot',
  text: '안녕하세요! 👋 HR 챗봇입니다.\n궁금한 점을 질문하거나 아래 버튼을 눌러보세요.',
};

function ChatbotModal({ onClose, darkMode = false }) {
  const dk = darkMode;
  const C = {
    panel:      dk ? '#1e293b' : '#ffffff',
    msgArea:    dk ? '#0f172a' : '#ffffff',
    botBubble:  dk ? '#263548' : '#f3f4f6',
    botText:    dk ? '#e2e8f0' : '#111827',
    notFoundBg: dk ? '#422006' : '#fef3c7',
    notFoundTx: dk ? '#fed7aa' : '#92400e',
    inputArea:  dk ? '#1e293b' : '#fafafa',
    inputBorder:dk ? '#334155' : '#e5e7eb',
    inputBg:    dk ? '#0f172a' : '#ffffff',
    inputBord2: dk ? '#4b5563' : '#d1d5db',
    inputText:  dk ? '#e2e8f0' : '#111827',
    quickBg:    dk ? '#312e81' : '#ede9fe',
    quickText:  dk ? '#c4b5fd' : '#5b21b6',
    quickBord:  dk ? '#4c1d95' : '#c4b5fd',
    catText:    dk ? '#a78bfa' : '#6d28d9',
    loadBubble: dk ? '#263548' : '#f3f4f6',
    loadText:   dk ? '#94a3b8' : '#6b7280',
  };
  const [messages, setMessages] = useState([BOT_INTRO]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      // 공휴일/휴무일/쉬는날 질문이면 공공데이터 API 우선 응답
      if (isHolidayQuery(q)) {
        const { year, month } = parseTargetMonth(q);
        const list = await fetchHolidaysByMonth(year, month);
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: formatHolidays(year, month, list), category: '공휴일 정보' },
        ]);
        return;
      }

      // 일반 FAQ 검색
      const res = await searchFaq(q);
      if (res.found) {
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: res.answer, category: res.category, question: res.question },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'bot', text: res.message, notFound: true },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', notFound: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* 오버레이 (클릭 시 닫기) */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
      />

      {/* 챗봇 패널 */}
      <div style={{
        position: 'fixed', bottom: 88, right: 24, zIndex: 2000,
        width: 340, height: 480,
        background: C.panel, borderRadius: 16,
        boxShadow: dk ? '0 8px 40px rgba(0,0,0,0.55)' : '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>💬 HR 챗봇</div>
            <div style={{ color: '#c4b5fd', fontSize: '0.72rem', marginTop: 2 }}>자주 묻는 질문에 답변합니다</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10, background: C.msgArea }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'bot' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', flexShrink: 0, alignSelf: 'flex-end', marginRight: 6,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: '78%',
                background: msg.role === 'user' ? '#4f46e5' : (msg.notFound ? C.notFoundBg : C.botBubble),
                color: msg.role === 'user' ? '#fff' : (msg.notFound ? C.notFoundTx : C.botText),
                padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.category && (
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, color: C.catText,
                    marginBottom: 4, letterSpacing: 0.3,
                  }}>
                    📂 {msg.category}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}

          {/* 빠른 질문 버튼 (초기 상태) */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    padding: '5px 10px', fontSize: '0.75rem',
                    background: C.quickBg, color: C.quickText,
                    border: `1px solid ${C.quickBord}`, borderRadius: 20,
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >{q}</button>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
              }}>🤖</div>
              <div style={{
                background: C.loadBubble, borderRadius: '14px 14px 14px 4px',
                padding: '9px 14px', fontSize: '0.82rem', color: C.loadText,
              }}>
                <span style={{ display: 'inline-block', animation: 'blink 1s infinite' }}>●</span>&nbsp;
                <span style={{ display: 'inline-block', animation: 'blink 1s 0.2s infinite' }}>●</span>&nbsp;
                <span style={{ display: 'inline-block', animation: 'blink 1s 0.4s infinite' }}>●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{
          padding: '10px 12px',
          borderTop: `1px solid ${C.inputBorder}`,
          display: 'flex', gap: 8, alignItems: 'center',
          background: C.inputArea,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="질문을 입력하세요..."
            style={{
              flex: 1, padding: '8px 12px',
              border: `1px solid ${C.inputBord2}`, borderRadius: 20,
              fontSize: '0.82rem', outline: 'none',
              background: C.inputBg, color: C.inputText,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: input.trim() && !loading ? '#4f46e5' : '#e5e7eb',
              color: input.trim() && !loading ? '#fff' : '#9ca3af',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >▶</button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40%           { opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── 플로팅 버튼 + 챗봇 + 팀채팅 통합 컴포넌트 ── */
function ChatbotButton({ darkMode = false }) {
  const [open,       setOpen]       = useState(false);  // HR 챗봇
  const [chatOpen,   setChatOpen]   = useState(false);  // 팀 채팅
  const [chatUnread, setChatUnread] = useState(0);      // 읽지 않은 메시지 수
  const [toasts,     setToasts]     = useState([]);     // 팝업 알림 목록
  const dk = darkMode;

  const handleChatToggle = () => {
    setChatOpen(o => !o);
    if (!chatOpen) setChatUnread(0); // 열 때 배지 초기화
  };

  const dismissToast = (id) =>
    setToasts(prev => prev.filter(t => t.id !== id));

  const openChatFromToast = (id) => {
    dismissToast(id);
    setChatOpen(true);
    setChatUnread(0);
  };

  const handleUnread = (msg) => {
    // 팀 채팅이 닫혀 있을 때만 배지 + 토스트 표시
    if (!chatOpen) {
      setChatUnread(n => n + 1);

      // 토스트 팝업 추가
      const id = Date.now();
      setToasts(prev => [...prev.slice(-2), { id, senderName: msg.senderName, content: msg.content, sentAt: msg.sentAt }]);
      setTimeout(() => dismissToast(id), 5000); // 5초 후 자동 제거
    }
  };

  return (
    <>
      {/* ── 팀 채팅 모달 ── */}
      {chatOpen && (
        <TeamChatModal
          onClose={() => setChatOpen(false)}
          darkMode={darkMode}
          onUnread={handleUnread}
        />
      )}

      {/* ── HR 챗봇 모달 ── */}
      {open && <ChatbotModal onClose={() => setOpen(false)} darkMode={darkMode} />}

      {/* ── 토스트 팝업 알림 ── */}
      <div style={{
        position: 'fixed', bottom: 92, right: 16, zIndex: 2100,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: dk ? '#1e293b' : '#ffffff',
              border: `1px solid ${dk ? '#334155' : '#e2e8f0'}`,
              borderLeft: '4px solid #0891b2',
              borderRadius: 12,
              padding: '10px 12px 10px 14px',
              boxShadow: dk
                ? '0 4px 24px rgba(0,0,0,0.55)'
                : '0 4px 20px rgba(0,0,0,0.14)',
              maxWidth: 280, minWidth: 200,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              animation: 'toastIn 0.3s ease',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            onClick={() => openChatFromToast(t.id)}
          >
            {/* 아이콘 */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #0369a1, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}>👥</div>

            {/* 내용 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0891b2' }}>
                  {t.senderName}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: 8 }}>
                  {t.sentAt}
                </span>
              </div>
              <div style={{
                fontSize: '0.78rem',
                color: dk ? '#e2e8f0' : '#374151',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 190,
              }}>
                {t.content.length > 45 ? t.content.slice(0, 45) + '…' : t.content}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: 4 }}>
                클릭하면 채팅 열기
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={e => { e.stopPropagation(); dismissToast(t.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: '0.85rem', padding: '0 2px',
                lineHeight: 1, flexShrink: 0, marginTop: 1,
              }}
            >✕</button>
          </div>
        ))}
      </div>

      {/* ── 팀 채팅 플로팅 버튼 (💬 버튼 왼쪽) ── */}
      <button
        onClick={handleChatToggle}
        title="팀 채팅"
        style={{
          position: 'fixed', bottom: 24, right: 92, zIndex: 1998,
          width: 56, height: 56, borderRadius: '50%',
          background: chatOpen
            ? '#6b7280'
            : 'linear-gradient(135deg, #0369a1, #0891b2)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem',
          boxShadow: '0 4px 16px rgba(8,145,178,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: chatOpen ? 'rotate(45deg) scale(0.95)' : 'none',
        }}
      >
        {chatOpen ? '✕' : '👥'}

        {/* 읽지 않은 메시지 배지 */}
        {!chatOpen && chatUnread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
            width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}>
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>

      {/* ── HR 챗봇 플로팅 버튼 ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="HR 챗봇"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1998,
          width: 56, height: 56, borderRadius: '50%',
          background: open
            ? '#6b7280'
            : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem',
          boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: open ? 'rotate(45deg) scale(0.95)' : 'none',
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default ChatbotButton;
