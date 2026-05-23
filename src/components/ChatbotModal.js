import React, { useState, useRef, useEffect } from 'react';
import { searchFaq, fetchHolidaysByMonth } from '../api/faqApi';

const QUICK = ['연차 일수', '급여일', '식비 한도', '출장비', '경조사 지원', '이번 달 휴무일'];

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 공휴일 관련 질문인지 감지
const isHolidayQuery = (q) =>
  /공휴일|휴무일|쉬는\s*날|휴일|빨간\s*날|쉬는날|선거일|선거\s*날/.test(q);

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

function ChatbotModal({ onClose }) {
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
        background: '#fff', borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                background: msg.role === 'user' ? '#4f46e5' : (msg.notFound ? '#fef3c7' : '#f3f4f6'),
                color: msg.role === 'user' ? '#fff' : (msg.notFound ? '#92400e' : '#111827'),
                padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.category && (
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, color: '#6d28d9',
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
                    background: '#ede9fe', color: '#5b21b6',
                    border: '1px solid #c4b5fd', borderRadius: 20,
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
                background: '#f3f4f6', borderRadius: '14px 14px 14px 4px',
                padding: '9px 14px', fontSize: '0.82rem', color: '#6b7280',
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
          borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 8, alignItems: 'center',
          background: '#fafafa',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="질문을 입력하세요..."
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid #d1d5db', borderRadius: 20,
              fontSize: '0.82rem', outline: 'none',
              background: '#fff',
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

/* ── 플로팅 버튼 + 챗봇 통합 컴포넌트 ── */
function ChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatbotModal onClose={() => setOpen(false)} />}

      {/* 플로팅 버튼 */}
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
    </>
  );
}

export default ChatbotButton;
