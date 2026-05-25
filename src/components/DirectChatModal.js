import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { authFetch, triggerLogout } from '../api/apiClient';

/**
 * 1:1 DM 채팅 모달
 * - visible=false 시 UI 숨김 (컴포넌트·WebSocket 유지)
 * - screen: 'search' → 직원 검색 / 'chat' → DM 대화
 */
export default function DirectChatModal({ onClose, darkMode, onDmUnread, visible }) {
  const myEmpno = sessionStorage.getItem('empno');   // null → 관리자
  const myName  = sessionStorage.getItem('username') || '알 수 없음';

  const [screen,      setScreen]      = useState('search');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [sessionErr,  setSessionErr]  = useState(false); // 401 세션 만료
  const [peer,        setPeer]        = useState(null);  // { empno, ename, job, photoUrl }
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [connected,   setConnected]   = useState(false);
  const [connecting,  setConnecting]  = useState(true);

  const clientRef = useRef(null);
  const peerRef   = useRef(null);
  const bottomRef = useRef(null);

  // stale closure 방지
  useEffect(() => { peerRef.current = peer; }, [peer]);

  /* ── WebSocket 연결 (항상 마운트 유지) ── */
  useEffect(() => {
    if (!myEmpno) { setConnecting(false); return; }

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true);
        setConnecting(false);

        // 내 사번 토픽 구독 → 나에게 오는 모든 DM 수신
        client.subscribe(`/topic/dm/${myEmpno}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            const currentPeer = peerRef.current;
            const me = Number(myEmpno);

            const inCurrentChat = currentPeer && (
              (msg.senderEmpno   === currentPeer.empno && msg.receiverEmpno === me) ||
              (msg.senderEmpno   === me                && msg.receiverEmpno === currentPeer.empno)
            );

            if (inCurrentChat) {
              setMessages(prev => [...prev, msg]);
            } else if (msg.senderEmpno !== me) {
              // 다른 사람의 DM → 상위 컴포넌트에 알림
              onDmUnread && onDmUnread(msg);
            }
          } catch { /* ignore */ }
        });
      },

      onDisconnect:  () => { setConnected(false); setConnecting(false); },
      onStompError:  () => { setConnected(false); setConnecting(false); },
    });

    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, []); // eslint-disable-line

  /* ── 직원 검색 ── */
  const doSearch = useCallback(async (name) => {
    if (!myEmpno) return;
    setSearching(true);
    setSessionErr(false);
    try {
      // noAutoLogout: true → 서버 401 수신 시 전역 로그아웃 안 함; 여기서 직접 처리
      const res = await authFetch(
        `/api/employees/search?name=${encodeURIComponent(name ?? query)}`,
        { noAutoLogout: true },
      );
      if (res.status === 401) {
        // 세션 만료 UI 표시 (강제 로그아웃 안 함 → 사용자가 확인 후 재로그인 선택)
        setSessionErr(true);
        setResults([]);
        setSearching(false);
        return;
      }
      const data = await res.json();
      setResults(Array.isArray(data)
        ? data.filter(e => e.empno !== Number(myEmpno))
        : []);
    } catch { setResults([]); }
    setSearching(false);
  }, [query, myEmpno]);

  /* ── 직원 선택 → DM 이력 로드 ── */
  const selectPeer = useCallback(async (emp) => {
    setPeer(emp);
    setMessages([]);
    setScreen('chat');
    if (myEmpno) {
      try {
        const res = await authFetch(
          `/api/dm/history?empno1=${myEmpno}&empno2=${emp.empno}`,
          { noAutoLogout: true },
        );
        if (res.status === 401) { setSessionErr(true); return; }
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    }
  }, [myEmpno]);

  /* ── 메시지 전송 ── */
  const send = useCallback(() => {
    const content = input.trim();
    if (!content || !connected || !clientRef.current || !peer || !myEmpno) return;
    clientRef.current.publish({
      destination: '/app/dm.send',
      body: JSON.stringify({
        senderEmpno:   Number(myEmpno),
        receiverEmpno: peer.empno,
        senderName:    myName,
        content,
      }),
    });
    setInput('');
  }, [input, connected, peer, myEmpno, myName]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ── 자동 스크롤: 새 메시지 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── 자동 스크롤: 채팅창 열릴 때 ── */
  useEffect(() => {
    if (visible && screen === 'chat') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
    }
  }, [visible, screen]);

  /* ── 검색화면 열릴 때 전체 목록 로드 ── */
  useEffect(() => {
    if (visible && screen === 'search' && myEmpno) doSearch('');
  }, [visible]); // eslint-disable-line

  /* ── UI 숨김 (WebSocket 유지) ── */
  if (!visible) return null;

  /* ── 스타일 ── */
  const dk = darkMode;
  const C = {
    bg:       dk ? '#1e293b' : '#ffffff',
    msgBg:    dk ? '#0f172a' : '#f0f4f8',
    myBubble: '#7c3aed',
    otherBg:  dk ? '#2d1f54' : '#ffffff',
    otherTxt: dk ? '#e2e8f0' : '#111827',
    inputBg:  dk ? '#0f172a' : '#ffffff',
    inputBrd: dk ? '#334155' : '#e5e7eb',
    footBg:   dk ? '#1e293b' : '#fafafa',
    srchBg:   dk ? '#0f172a' : '#f8fafc',
    cardBg:   dk ? '#1e3a4c' : '#ffffff',
    cardBrd:  dk ? '#334155' : '#e5e7eb',
    txtMain:  dk ? '#e2e8f0' : '#111827',
    txtSub:   dk ? '#94a3b8' : '#6b7280',
    timeCl:   '#94a3b8',
  };

  const goSearch = () => {
    setScreen('search');
    setPeer(null);
    setMessages([]);
    setQuery('');
    doSearch('');
  };

  return (
    <>
      {/* 오버레이 */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1999 }} />

      {/* 패널 */}
      <div style={{
        position: 'fixed', bottom: 88, right: 92, zIndex: 2000,
        width: 360, height: 520,
        background: C.bg, borderRadius: 18,
        boxShadow: dk ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.16)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'tcSlideUp 0.2s ease',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {screen === 'chat' && (
              <button onClick={goSearch} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>
            )}
            <span style={{ fontSize: '1.2rem' }}>💌</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                {screen === 'search' ? '1:1 채팅' : peer?.ename}
              </div>
              {screen === 'chat' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: connected ? '#4ade80' : connecting ? '#fbbf24' : '#f87171',
                    boxShadow: connected ? '0 0 6px #4ade80' : 'none',
                    transition: 'background 0.3s',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>
                    {connected ? '실시간 연결됨' : connecting ? '연결 중...' : '연결 끊김'}
                  </span>
                </div>
              )}
              {screen === 'search' && (
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', marginTop: 2 }}>
                  사원을 검색하여 채팅 시작
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, padding: '4px 6px',
          }}>✕</button>
        </div>

        {/* ══════════════ 검색 화면 ══════════════ */}
        {screen === 'search' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* 검색 입력 */}
            <div style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${C.inputBrd}`,
              background: C.srchBg, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') doSearch(query); }}
                  placeholder="이름으로 검색... (Enter)"
                  style={{
                    flex: 1, padding: '8px 12px',
                    border: `1.5px solid ${C.inputBrd}`, borderRadius: 10,
                    fontSize: '0.83rem', background: C.inputBg,
                    color: C.txtMain, outline: 'none',
                  }}
                />
                <button
                  onClick={() => doSearch(query)}
                  style={{
                    padding: '8px 14px', background: '#7c3aed', color: '#fff',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontSize: '0.83rem', fontWeight: 600,
                  }}>검색</button>
              </div>
            </div>

            {/* 직원 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {!myEmpno && (
                <div style={{ textAlign: 'center', color: C.txtSub, marginTop: 80, fontSize: 13 }}>
                  ⚠️ 관리자는 1:1 채팅을 이용할 수 없습니다.
                </div>
              )}

              {/* 세션 만료 안내 */}
              {myEmpno && sessionErr && (
                <div style={{
                  textAlign: 'center', marginTop: 60, padding: '0 20px',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔒</div>
                  <div style={{ color: C.txtMain, fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>
                    세션이 만료되었습니다
                  </div>
                  <div style={{ color: C.txtSub, fontSize: '0.78rem', marginBottom: 16 }}>
                    보안을 위해 다시 로그인해주세요.
                  </div>
                  <button
                    onClick={() => triggerLogout('session_expired_ui')}
                    style={{
                      padding: '8px 20px', background: '#7c3aed', color: '#fff',
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.83rem',
                    }}
                  >
                    다시 로그인
                  </button>
                </div>
              )}

              {myEmpno && !sessionErr && searching && (
                <div style={{ textAlign: 'center', color: C.txtSub, marginTop: 80, fontSize: 13 }}>
                  🔍 검색 중...
                </div>
              )}
              {myEmpno && !sessionErr && !searching && results.length === 0 && (
                <div style={{ textAlign: 'center', color: C.txtSub, marginTop: 80, fontSize: 13 }}>
                  검색 결과가 없습니다.
                </div>
              )}
              {myEmpno && !sessionErr && !searching && results.map(emp => (
                <div
                  key={emp.empno}
                  onClick={() => selectPeer(emp)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: C.cardBg, border: `1px solid ${C.cardBrd}`,
                    cursor: 'pointer', marginBottom: 6,
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* 프로필 이미지 */}
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.ename}
                      style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '1rem',
                    }}>
                      {emp.ename?.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.txtMain }}>
                      {emp.ename}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.txtSub, marginTop: 2 }}>
                      {emp.job || '직책 없음'} · 사번 {emp.empno}
                    </div>
                  </div>
                  <span style={{ color: '#7c3aed', fontSize: '1.1rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ 채팅 화면 ══════════════ */}
        {screen === 'chat' && (
          <>
            {/* 메시지 영역 */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 10px',
              display: 'flex', flexDirection: 'column', gap: 4,
              background: C.msgBg,
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 80, fontSize: 13 }}>
                  💌 {peer?.ename}님과 대화를 시작해보세요!<br />
                  <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                    메시지는 상대방에게만 전달됩니다
                  </span>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe      = msg.senderEmpno === Number(myEmpno);
                const sameGroup = i > 0 && messages[i - 1]?.senderEmpno === msg.senderEmpno;

                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    marginTop: sameGroup ? 2 : 10,
                  }}>
                    {!isMe && !sameGroup && (
                      <div style={{ fontSize: 11, color: '#7c3aed', marginBottom: 3, marginLeft: 4, fontWeight: 600 }}>
                        {msg.senderName}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <div style={{
                        maxWidth: '72%',
                        background: isMe ? C.myBubble : C.otherBg,
                        color:      isMe ? '#ffffff'  : C.otherTxt,
                        padding: '8px 12px',
                        borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        fontSize: '0.83rem', lineHeight: 1.5,
                        boxShadow: isMe
                          ? '0 2px 8px rgba(124,58,237,0.35)'
                          : dk ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 10, color: C.timeCl, flexShrink: 0, marginBottom: 2 }}>
                        {msg.sentAt}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* 입력창 */}
            <div style={{
              padding: '10px 12px',
              borderTop: `1px solid ${C.inputBrd}`,
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: C.footBg, flexShrink: 0,
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  !myEmpno     ? '사원만 이용 가능합니다' :
                  connected    ? '메시지 입력... (Enter 전송)' :
                  connecting   ? '연결 중...' : '연결 끊김'
                }
                disabled={!connected || !myEmpno}
                rows={1}
                style={{
                  flex: 1, padding: '9px 13px',
                  border: `1.5px solid ${connected ? C.inputBrd : '#fbbf24'}`,
                  borderRadius: 20, fontSize: '0.82rem', outline: 'none',
                  background: C.inputBg, color: dk ? '#e2e8f0' : '#111827',
                  resize: 'none', lineHeight: 1.4, maxHeight: 80, overflowY: 'auto',
                  transition: 'border-color 0.2s', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || !connected}
                title="전송 (Enter)"
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: input.trim() && connected ? '#7c3aed' : '#e2e8f0',
                  color:      input.trim() && connected ? '#fff'    : '#9ca3af',
                  border: 'none',
                  cursor: input.trim() && connected ? 'pointer' : 'default',
                  fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >▶</button>
            </div>
          </>
        )}
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
