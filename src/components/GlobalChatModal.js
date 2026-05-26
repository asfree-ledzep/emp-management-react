import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { authFetch } from '../api/apiClient';

/** 파일 메시지 판별 / 파싱 */
const isFileMsg = (c) => { try { return JSON.parse(c)?._type === 'file'; } catch { return false; } };
const parseFile = (c) => JSON.parse(c);

async function uploadChatFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch('/api/chat/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('업로드 실패');
  return res.json();
}

/**
 * 전체 채팅 모달
 * - 모든 사원·관리자가 참여하는 공개 채팅방
 * - /topic/chat 구독, /app/chat.send 발행
 * - 파일 드래그앤드롭 → S3 업로드 → 다운로드 링크 전송
 */
export default function GlobalChatModal({ onClose, darkMode, onUnread, visible }) {
  const username = sessionStorage.getItem('username') || '알 수 없음';
  const empno    = sessionStorage.getItem('empno');

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [dragOver,   setDragOver]   = useState(false);
  const [uploading,  setUploading]  = useState(false);

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
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true); setConnecting(false);
        client.subscribe('/topic/chat', (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            setMessages(prev => [...prev, msg]);
            if (String(msg.senderName) !== String(username)) onUnread?.(msg);
          } catch { /* ignore */ }
        });
      },
      onDisconnect: () => { setConnected(false); setConnecting(false); },
      onStompError: () => { setConnected(false); setConnecting(false); },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, []); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (visible) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
  }, [visible]);

  /* ── 메시지 전송 ── */
  const send = useCallback((content) => {
    const text = (content ?? input).trim();
    if (!text || !connected || !clientRef.current) return;
    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ empno: empno ? Number(empno) : null, senderName: username, content: text }),
    });
    if (!content) setInput('');
  }, [input, connected, empno, username]);

  /* ── 파일 드래그앤드롭 ── */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); setDragOver(false);
    if (!connected) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { url, fileName } = await uploadChatFile(file);
        send(JSON.stringify({ _type: 'file', name: fileName, url }));
      } catch { /* ignore */ }
    }
    setUploading(false);
  }, [connected, send]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  /* ── 스타일 ── */
  const dk = darkMode;
  const C = {
    bg: dk ? '#1e293b' : '#ffffff', msgBg: dk ? '#0f172a' : '#f0f4f8',
    myBubble: '#059669', otherBg: dk ? '#1a3a2c' : '#ffffff', otherText: dk ? '#e2e8f0' : '#111827',
    inputBg: dk ? '#0f172a' : '#ffffff', inputBord: dk ? '#334155' : '#e5e7eb',
    footBg: dk ? '#1e293b' : '#fafafa', timeColor: '#94a3b8', nameColor: dk ? '#6ee7b7' : '#047857',
  };

  /* ── 메시지 렌더 ── */
  const renderContent = (msg) => {
    if (isFileMsg(msg.content)) {
      const { name, url } = parseFile(msg.content);
      const downloadUrl = `/api/chat/download?url=${encodeURIComponent(url)}`;
      return (
        <a href={downloadUrl} rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.1rem' }}>📎</span>
          <span style={{ textDecoration: 'underline', fontSize: '0.8rem', wordBreak: 'break-all' }}>{name}</span>
        </a>
      );
    }
    return msg.content;
  };

  if (!visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          position: 'fixed', bottom: 88, right: 92, zIndex: 2000,
          width: 360, height: 520, background: C.bg, borderRadius: 18,
          boxShadow: dk ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.16)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'tcSlideUp 0.2s ease',
          outline: dragOver ? '3px dashed #059669' : 'none', transition: 'outline 0.15s',
        }}>

        {/* 드래그 오버레이 */}
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(5,150,105,0.15)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: 18, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '2.5rem' }}>📎</span>
            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.9rem', marginTop: 8 }}>파일을 여기에 놓으세요</span>
          </div>
        )}

        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #047857, #059669)',
          padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>전체 채팅</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: connected ? '#4ade80' : connecting ? '#fbbf24' : '#f87171',
                  boxShadow: connected ? '0 0 6px #4ade80' : 'none', transition: 'background 0.3s',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>
                  {connected ? '실시간 연결됨' : connecting ? '연결 중...' : '연결 끊김 (재연결 중)'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }}>✕</button>
        </div>

        {/* 업로드 중 배너 */}
        {uploading && (
          <div style={{ padding: '6px 12px', background: '#05966922', fontSize: '0.75rem', color: '#059669', textAlign: 'center', flexShrink: 0 }}>
            📤 파일 업로드 중...
          </div>
        )}

        {/* 메시지 영역 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 10px',
          display: 'flex', flexDirection: 'column', gap: 4, background: C.msgBg,
        }}>
          {messages.length === 0 && !connecting && (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 80, fontSize: 13 }}>
              🌐 전체 채팅방에 오신 것을 환영합니다!<br />
              <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>파일을 드래그&드롭으로 공유할 수 있습니다</span>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe      = String(msg.senderName) === String(username);
            const showName  = !isMe && (i === 0 || messages[i - 1]?.senderName !== msg.senderName);
            const sameGroup = i > 0 && messages[i - 1]?.senderName === msg.senderName;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: sameGroup ? 2 : 10 }}>
                {showName && (
                  <div style={{ fontSize: 11, color: C.nameColor, marginBottom: 3, marginLeft: 4, fontWeight: 600 }}>{msg.senderName}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div style={{
                    maxWidth: '72%', padding: '8px 12px',
                    background: isMe ? C.myBubble : C.otherBg, color: isMe ? '#ffffff' : C.otherText,
                    borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    fontSize: '0.83rem', lineHeight: 1.5,
                    boxShadow: isMe ? '0 2px 8px rgba(5,150,105,0.35)' : dk ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                  }}>{renderContent(msg)}</div>
                  <div style={{ fontSize: 10, color: C.timeColor, flexShrink: 0, marginBottom: 2 }}>{msg.sentAt}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{
          padding: '10px 12px', borderTop: `1px solid ${C.inputBord}`,
          display: 'flex', gap: 8, alignItems: 'flex-end', background: C.footBg, flexShrink: 0,
        }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={connected ? '메시지 입력... (Enter 전송, 파일은 드래그&드롭)' : '연결 중...'}
            disabled={!connected} rows={1}
            style={{
              flex: 1, padding: '9px 13px', border: `1.5px solid ${connected ? C.inputBord : '#fbbf24'}`,
              borderRadius: 20, fontSize: '0.82rem', outline: 'none',
              background: C.inputBg, color: dk ? '#e2e8f0' : '#111827',
              resize: 'none', lineHeight: 1.4, maxHeight: 80, overflowY: 'auto', fontFamily: 'inherit',
            }}
          />
          <button onClick={() => send()} disabled={!input.trim() || !connected} title="전송 (Enter)"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: input.trim() && connected ? '#059669' : '#e2e8f0',
              color: input.trim() && connected ? '#fff' : '#9ca3af',
              border: 'none', cursor: input.trim() && connected ? 'pointer' : 'default',
              fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>▶</button>
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
