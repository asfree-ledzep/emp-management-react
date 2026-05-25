import React, { useState, useEffect } from 'react';
import { scanQr } from '../api/attendanceApi';

/**
 * QR 스캔 후 이동되는 페이지.
 * URL: /?qr=<TOKEN>
 * 로그인된 사용자의 empno로 자동 처리.
 */
export default function QrScanPage({ user, onHome, onAttendance }) {
  const token = new URLSearchParams(window.location.search).get('qr');

  const [status, setStatus]   = useState('scanning'); // scanning | success | error
  const [result, setResult]   = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('QR 토큰이 없습니다.');
      return;
    }
    if (!user || !user.empno) {
      setStatus('error');
      setMessage('로그인이 필요합니다.');
      return;
    }

    (async () => {
      try {
        const data = await scanQr(token, user.empno);
        setResult(data);
        if (data.result === 'INVALID_TOKEN') {
          setStatus('error');
          setMessage(data.message);
        } else {
          setStatus('success');
          setMessage(data.message);
        }
      } catch {
        setStatus('error');
        setMessage('처리 중 오류가 발생했습니다.');
      }
    })();
  }, [token, user]);

  const resultIcon = {
    CHECK_IN:            '✅',
    CHECK_OUT:           '🏠',
    ALREADY_CHECKED_IN:  'ℹ️',
    ALREADY_CHECKED_OUT: 'ℹ️',
    NO_CHECK_IN:         '⚠️',
    INVALID_TOKEN:       '❌',
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {status === 'scanning' && (
          <>
            <div style={styles.spinner}>⏳</div>
            <p style={styles.msg}>처리 중...</p>
          </>
        )}

        {status === 'success' && result && (
          <>
            <div style={styles.icon}>{resultIcon[result.result] || '✅'}</div>
            <h2 style={styles.title}>
              {result.result === 'CHECK_IN'  ? '출근 완료' :
               result.result === 'CHECK_OUT' ? '퇴근 완료' : '처리 완료'}
            </h2>
            <p style={styles.msg}>{message}</p>
            {result.checkIn   && <p style={styles.detail}>출근: {result.checkIn}</p>}
            {result.checkOut  && <p style={styles.detail}>퇴근: {result.checkOut}</p>}
            {result.workMinutes != null && result.workMinutes > 0 && (
              <p style={styles.detail}>
                근무시간: {Math.floor(result.workMinutes / 60)}시간{' '}
                {result.workMinutes % 60}분
              </p>
            )}
            {result.status && (
              <p style={styles.detail}>
                상태:{' '}
                {{ NORMAL: '정상', LATE: '지각', EARLY_LEAVE: '조퇴' }[result.status]
                  || result.status}
              </p>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.icon}>❌</div>
            <h2 style={styles.title}>오류</h2>
            <p style={styles.msg}>{message}</p>
          </>
        )}

        <div style={styles.btnRow}>
          <button style={styles.btn} onClick={onHome || (() => window.location.href = '/')}>
            홈으로
          </button>
          {onAttendance && (
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={onAttendance}
            >
              내 출근 기록
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    background: '#f8f9fa',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    maxWidth: 380,
    width: '100%',
  },
  icon:    { fontSize: 64, marginBottom: 16 },
  spinner: { fontSize: 48, marginBottom: 16 },
  title:   { fontSize: 24, fontWeight: 700, margin: '0 0 12px' },
  msg:     { color: '#555', fontSize: 16, margin: '0 0 8px' },
  detail:  { color: '#333', fontSize: 15, margin: '4px 0' },
  btnRow:  { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 },
  btn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  btnSecondary: {
    background: '#fff',
    color: '#4f46e5',
    border: '2px solid #4f46e5',
  },
};
