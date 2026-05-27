import React, { useState, useEffect } from 'react';
import { _resolveModal } from '../utils/confirmDialog';

/**
 * 전역 Confirm / Alert 모달
 * App.js 최상위에 1번만 렌더링하면 어디서든 showConfirm / showAlert 사용 가능
 */
export default function GlobalConfirmModal() {
  const [state, setState] = useState(null);
  // state: { type, message, title, confirmText, cancelText, danger }

  useEffect(() => {
    const handler = (e) => setState(e.detail);
    window.addEventListener('app:modal', handler);
    return () => window.removeEventListener('app:modal', handler);
  }, []);

  if (!state) return null;

  const isAlert   = state.type === 'alert';
  const btnColor  = state.danger ? '#ef4444' : '#4f46e5';
  const btnHover  = state.danger ? '#dc2626' : '#4338ca';

  const confirm = () => { _resolveModal(true);  setState(null); };
  const cancel  = () => { _resolveModal(false); setState(null); };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        onClick={cancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 99998,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* 모달 박스 */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999,
          background: '#fff',
          borderRadius: 16,
          padding: '32px 32px 24px',
          width: 'min(420px, 90vw)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          animation: 'modalPop 0.18s ease',
          textAlign: 'center',
        }}
      >
        {/* 아이콘 */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
          background: state.danger ? '#fee2e2' : (isAlert ? '#dbeafe' : '#fef3c7'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.6rem',
        }}>
          {state.danger ? '⚠️' : isAlert ? 'ℹ️' : '❓'}
        </div>

        {/* 제목 */}
        <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
          {state.title}
        </h3>

        {/* 메시지 */}
        <p style={{
          margin: '0 0 24px', fontSize: '0.92rem',
          color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          {state.message}
        </p>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!isAlert && (
            <button
              onClick={cancel}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: '#f3f4f6', color: '#374151',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.9rem', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.target.style.background = '#e5e7eb'}
              onMouseOut={e => e.target.style.background = '#f3f4f6'}
            >
              {state.cancelText || '취소'}
            </button>
          )}
          <button
            onClick={confirm}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: btnColor, color: '#fff',
              border: 'none', cursor: 'pointer', fontWeight: 700,
              fontSize: '0.9rem', transition: 'background 0.15s',
            }}
            onMouseOver={e => e.target.style.background = btnHover}
            onMouseOut={e => e.target.style.background = btnColor}
          >
            {state.confirmText || (isAlert ? '확인' : '확인')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          from { opacity:0; transform: translate(-50%,-50%) scale(0.92); }
          to   { opacity:1; transform: translate(-50%,-50%) scale(1); }
        }
      `}</style>
    </>
  );
}
