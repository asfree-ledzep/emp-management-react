import React, { useState, useEffect, useCallback } from 'react';
import { fetchTodos, toggleTodo } from '../api/todoApi';

const PRIORITY_LABEL = {
  HIGH:   { text: '높음', bg: '#fee2e2', color: '#dc2626' },
  LOW:    { text: '낮음', bg: '#fef3c7', color: '#d97706' },
};

export default function TodoFloatButton({ darkMode = false }) {
  const [open,    setOpen]    = useState(false);
  const [todos,   setTodos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const dk = darkMode;

  const load = useCallback(() => {
    setLoading(true);
    fetchTodos()
      .then(d => {
        if (Array.isArray(d)) {
          setTodos(d);
        } else {
          console.warn('[TodoFloat] 예상치 않은 응답 형식:', d);
          setTodos([]);
        }
      })
      .catch(err => {
        console.error('[TodoFloat] fetchTodos 오류:', err);
        setTodos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // 마운트 시 초기 로드
  useEffect(() => {
    load();
  }, [load]);

  // 패널이 열릴 때마다 새로 조회
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // TodoPage에서 할일 변경 시 즉시 동기화
  useEffect(() => {
    window.addEventListener('todo:updated', load);
    return () => window.removeEventListener('todo:updated', load);
  }, [load]);

  // 60초 폴링 (백그라운드 최신화)
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const handleToggle = async (todoId) => {
    try {
      await toggleTodo(todoId);
      load();
    } catch (err) {
      console.error('[TodoFloat] toggleTodo 오류:', err);
    }
  };

  // isDone 필드 호환 처리 (Jackson이 boolean isDone을 'done'으로 직렬화하는 경우 대비)
  const isDone = (t) => !!(t.isDone || t.done);

  const incomplete = todos.filter(t => !isDone(t));
  const count      = incomplete.length;
  const todayStr   = new Date().toISOString().slice(0, 10);

  // 다크 팔레트
  const panel  = dk ? '#1e293b' : '#ffffff';
  const border = dk ? '#334155' : '#f3f4f6';
  const text   = dk ? '#e2e8f0' : '#374151';
  const muted  = dk ? '#64748b' : '#9ca3af';

  return (
    <>
      {/* ── 미니 패널 ── */}
      {open && (
        <>
          {/* 오버레이 (클릭 시 닫기) */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
          />

          {/* 패널 */}
          <div style={{
            position: 'fixed', bottom: 88, right: 160, zIndex: 2000,
            width: 300, maxHeight: 420,
            background: panel, borderRadius: 16,
            boxShadow: dk
              ? '0 8px 40px rgba(0,0,0,0.55)'
              : '0 8px 40px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'todoSlideUp 0.2s ease',
          }}>

            {/* 헤더 */}
            <div style={{
              background: 'linear-gradient(135deg, #0d9488, #10b981)',
              padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>
                  ☑️ 내 할일
                </div>
                <div style={{ color: '#a7f3d0', fontSize: '0.72rem', marginTop: 2 }}>
                  미완료 {loading ? '…' : `${count}건`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* 새로고침 버튼 */}
                <button
                  onClick={e => { e.stopPropagation(); load(); }}
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

            {/* 목록 영역 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: '0.85rem' }}>
                  불러오는 중...
                </div>
              ) : incomplete.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '32px 0',
                  color: muted, fontSize: '0.85rem',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🎉</div>
                  모든 할일을 완료했어요!
                </div>
              ) : (
                incomplete.slice(0, 12).map((todo, idx) => {
                  const overdue = todo.dueDate && todo.dueDate < todayStr;
                  const pr = PRIORITY_LABEL[todo.priority];
                  return (
                    <div key={todo.todoId} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9,
                      padding: '8px 4px',
                      borderBottom: idx < incomplete.slice(0, 12).length - 1
                        ? `1px solid ${border}` : 'none',
                    }}>
                      {/* 체크박스 */}
                      <button
                        onClick={() => handleToggle(todo.todoId)}
                        title="완료 처리"
                        style={{
                          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${dk ? '#475569' : '#d1d5db'}`,
                          background: 'none', cursor: 'pointer', marginTop: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.84rem', color: text, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {todo.content}
                        </div>
                        {todo.dueDate && (
                          <div style={{
                            fontSize: '0.72rem', marginTop: 2,
                            color: overdue ? '#ef4444' : muted,
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            <span>{overdue ? '🟠' : '📅'}</span>
                            <span>{todo.dueDate}</span>
                            {overdue && <span style={{ fontWeight: 600 }}>기한 초과</span>}
                          </div>
                        )}
                      </div>
                      {pr && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700,
                          borderRadius: 10, padding: '2px 6px',
                          background: pr.bg, color: pr.color,
                          flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
                        }}>
                          {pr.text}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              {!loading && incomplete.length > 12 && (
                <div style={{
                  textAlign: 'center', fontSize: '0.75rem',
                  color: muted, padding: '8px 0',
                }}>
                  +{incomplete.length - 12}개 더 있습니다
                </div>
              )}
            </div>

            {/* 완료 통계 푸터 */}
            <div style={{
              flexShrink: 0,
              borderTop: `1px solid ${border}`,
              padding: '8px 14px',
              fontSize: '0.75rem', color: muted,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>전체 {todos.length}건</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                완료 {todos.filter(t => isDone(t)).length}건
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="내 할일"
        style={{
          position: 'fixed', bottom: 24, right: 160, zIndex: 1998,
          width: 56, height: 56, borderRadius: '50%',
          background: open
            ? '#6b7280'
            : 'linear-gradient(135deg, #0d9488, #10b981)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.3rem',
          boxShadow: '0 4px 16px rgba(13,148,136,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: open ? 'rotate(45deg) scale(0.95)' : 'none',
        }}
      >
        {open ? '✕' : '☑️'}

        {/* 미완료 배지 */}
        {!open && count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
            width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <style>{`
        @keyframes todoSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
