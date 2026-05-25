import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { authFetch } from '../api/apiClient';

/**
 * 팀 채팅 모달
 * - WebSocket(STOMP/SockJS) 실시간 메시지
 * - REST /api/chat/history 로 이전 메시지 로드
 */
export default function TeamChatModal({ onClose, darkMode, onUnread }) {
  const username = sessionStorage.getItem('username') || '알 수 없음';
  const empno    = sessionStorage.getItem('empno');   // 사원 null → 관리자

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(true);

  const clientRef = useRef(null);
  const bottomRef = useRef(null);

  /* ── 이전 메시지 로드 ── */
  useEffect(() => {
    authFetch('/api/chat/history')
      .then(r => r.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  /* ── WebSocket 연결 ── */
  useEffect(() => {
    const client = new Client({
      // SockJS: /ws → Vercel proxy → EB 서버
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true);
        setConnecting(false);
        // /topic/chat 구독 → 실시간 메시지 수신
        client.subscribe('/topic/chat', (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            setMessages(prev => [...prev, msg]);
            // 내 메시지가 아닐 때 unread 카운트
            if (String(msg.senderName) !== String(username)) {
              onUnread && onUnread();
            }
          } catch { /* ignore */ }
        });
      },

      onDisconnect: () => {
        setConnected(false);
        setConnecting(false);
      },

      onStompError: () => {
        setConnected(false);
        setConnecting(false);
      },
    });

    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, []); // eslint-disable-line

  /* ── 자동 스크롤 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── 메시지 전송 ── */
  const send = useCallback(() => {
    const content = input.trim();
    if (!content || !connected || !clientRef.current) return;

    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        empno:      empno ? Number(empno) : null,
        senderName: username,
        content,
      }),
    });
    setInput('');
  }, [input, connected, empno, username]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ── 스타일 ── */
  const dk = darkMode;
  const C = {
    bg:        dk ? '#1e293b' : '#ffffff',
    msgBg:     dk ? '#0f172a' : '#f0f4f8',
    myBubble:  '#0891b2',
    otherBg:   dk ? '#1e3a4c' : '#ffffff',
    otherText: dk ? '#e2e8f0' : '#111827',
    inputBg:   dk ? '#0f172a' : '#ffffff',
    inputBord: dk ? '#334155' : '#e5e7eb',
    footBg:    dk ? '#1e293b' : '#fafafa',
    timeColor: '#94a3b8',
    nameColor: dk ? '#7dd3fc' : '#0369a1',
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />

      {/* 채팅 패널 */}
      <div style={{
        position: 'fixed', bottom: 88, right: 92, zIndex: 2000,
        width: 360, height: 520,
        background: C.bg, borderRadius: 18,
        boxShadow: dk
          ? '0 8px 40px rgba(0,0,0,0.6)'
          : '0 8px 40px rgba(0,0,0,0.16)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'tcSlideUp 0.2s ease',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0369a1, #0891b2)',
          padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>👥</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                팀 채팅
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: connected ? '#4ade80' : connecting ? '#fbbf24' : '#f87171',
                  boxShadow: connected ? '0 0 6px #4ade80' : 'none',
                  transition: 'background 0.3s',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>
                  {connected ? '실시간 연결됨' : connecting ? '연결 중...' : '연결 끊김 (재연결 중)'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }}
          >✕</button>
        </div>

        {/* ── 메시지 영역 ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 10px',
          display: 'flex', flexDirection: 'column', gap: 4,
          background: C.msgBg,
        }}>
          {messages.length === 0 && !connecting && (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 80, fontSize: 13 }}>
              💬 아직 대화가 없습니다.<br />
              <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>팀원들에게 먼저 인사해보세요!</span>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe      = String(msg.senderName) === String(username);
            // 이전 메시지와 발신자가 같으면 이름 숨김
            const showName  = !isMe && (i === 0 || messages[i - 1]?.senderName !== msg.senderName);
            // 같은 발신자가 연속으로 쓸 때 말풍선 간격 줄임
            const sameGroup = i > 0 && messages[i - 1]?.senderName === msg.senderName;

            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                marginTop: sameGroup ? 2 : 10,
              }}>
                {/* 발신자 이름 */}
                {showName && (
                  <div style={{ fontSize: 11, color: C.nameColor, marginBottom: 3, marginLeft: 4, fontWeight: 600 }}>
                    {msg.senderName}
                  </div>
                )}

                {/* 말풍선 + 시간 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div style={{
                    maxWidth: '72%',
                    background: isMe ? C.myBubble : C.otherBg,
                    color:      isMe ? '#ffffff' : C.otherText,
                    padding:    '8px 12px',
                    borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    fontSize: '0.83rem', lineHeight: 1.5,
                    boxShadow: isMe
                      ? '0 2px 8px rgba(8,145,178,0.35)'
                      : dk ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: C.timeColor, flexShrink: 0, marginBottom: 2 }}>
                    {msg.sentAt}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* ── 입력창 ── */}
        <div style={{
          padding: '10px 12px',
          borderTop: `1px solid ${C.inputBord}`,
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: C.footBg,
          flexShrink: 0,
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={connected ? '메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)' : '연결 중...'}
            disabled={!connected}
            rows={1}
            style={{
              flex: 1, padding: '9px 13px',
              border: `1.5px solid ${connected ? C.inputBord : '#fbbf24'}`,
              borderRadius: 20, fontSize: '0.82rem', outline: 'none',
              background: C.inputBg,
              color: dk ? '#e2e8f0' : '#111827',
              resize: 'none', lineHeight: 1.4,
              maxHeight: 80, overflowY: 'auto',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || !connected}
            title="전송 (Enter)"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: input.trim() && connected ? '#0891b2' : '#e2e8f0',
              color:      input.trim() && connected ? '#fff' : '#9ca3af',
              border: 'none',
              cursor: input.trim() && connected ? 'pointer' : 'default',
              fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s, transform 0.1s',
              transform: input.trim() && connected ? 'scale(1)' : 'scale(0.9)',
            }}
          >▶</button>
        </div>
      </div>

      <style>{`
        @keyframes tcSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
