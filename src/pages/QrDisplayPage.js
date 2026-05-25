import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { fetchCurrentQr, fetchTodayAttendance } from '../api/attendanceApi';

const QR_REFRESH_MS = 30_000;   // 30초마다 토큰 갱신 시도
const LIST_REFRESH_MS = 15_000; // 15초마다 출근 목록 갱신

const VERCEL_BASE =
  process.env.REACT_APP_FRONTEND_BASE || window.location.origin;

const STATUS_LABEL = {
  NORMAL:       { text: '정상', color: '#28a745' },
  LATE:         { text: '지각', color: '#e67e22' },
  EARLY_LEAVE:  { text: '조퇴', color: '#e74c3c' },
  ABSENT:       { text: '결근', color: '#95a5a6' },
};

export default function QrDisplayPage() {
  const [token, setToken]       = useState(null);
  const [expiresAt, setExpires] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadToken = useCallback(async () => {
    try {
      const data = await fetchCurrentQr();
      setToken(data.token);
      setExpires(data.expiresAt);
      const diff = Math.max(
        0,
        Math.floor((new Date(data.expiresAt) - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
      setError('');
    } catch {
      setError('QR 토큰 로드 실패');
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchTodayAttendance();
      setList(data);
    } catch {
      // 목록 오류는 조용히
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    (async () => {
      await Promise.all([loadToken(), loadList()]);
      setLoading(false);
    })();
  }, [loadToken, loadList]);

  // QR 토큰 주기적 갱신
  useEffect(() => {
    const id = setInterval(loadToken, QR_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadToken]);

  // 출근 목록 주기적 갱신
  useEffect(() => {
    const id = setInterval(loadList, LIST_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadList]);

  // 초 카운트다운
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { loadToken(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft, loadToken]);

  const qrUrl = token
    ? `${VERCEL_BASE}?qr=${encodeURIComponent(token)}`
    : '';

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  if (loading) return <div style={styles.center}>QR 코드 로딩 중...</div>;

  return (
    <div style={styles.page}>
      {/* 왼쪽: QR 표시 */}
      <div style={styles.qrPanel}>
        <h2 style={styles.heading}>출퇴근 QR 코드</h2>
        <p style={styles.date}>{todayStr}</p>

        {error ? (
          <div style={styles.errorBox}>{error}</div>
        ) : (
          <>
            <div style={styles.qrBox}>
              <QRCode value={qrUrl} size={220} />
            </div>
            <div style={styles.timer}>
              만료까지: <strong>{secondsLeft}초</strong>
            </div>
            <div style={styles.expiresAt}>만료: {expiresAt}</div>
            <button style={styles.refreshBtn} onClick={loadToken}>
              🔄 QR 새로고침
            </button>
            <p style={styles.hint}>
              스마트폰으로 QR을 스캔하면 출퇴근이 자동으로 기록됩니다.
            </p>
          </>
        )}
      </div>

      {/* 오른쪽: 오늘 출근 현황 */}
      <div style={styles.listPanel}>
        <h3 style={styles.listHeading}>
          오늘 출근 현황 <span style={styles.count}>({list.length}명)</span>
        </h3>
        {list.length === 0 ? (
          <p style={styles.empty}>아직 출근한 직원이 없습니다.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>부서</th>
                <th style={styles.th}>출근</th>
                <th style={styles.th}>퇴근</th>
                <th style={styles.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map(row => {
                const st = STATUS_LABEL[row.status] || { text: row.status, color: '#555' };
                return (
                  <tr key={row.attendId} style={styles.tr}>
                    <td style={styles.td}>{row.ename}</td>
                    <td style={styles.td}>{row.dname}</td>
                    <td style={styles.td}>{row.checkIn || '-'}</td>
                    <td style={styles.td}>{row.checkOut || '-'}</td>
                    <td style={{ ...styles.td, color: st.color, fontWeight: 600 }}>
                      {st.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    gap: 32,
    padding: '32px 24px',
    minHeight: '80vh',
    alignItems: 'flex-start',
  },
  qrPanel: {
    flex: '0 0 320px',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    padding: 32,
    textAlign: 'center',
  },
  heading: { fontSize: 22, fontWeight: 700, margin: '0 0 6px' },
  date: { color: '#666', fontSize: 14, marginBottom: 20 },
  qrBox: {
    display: 'inline-block',
    background: '#fff',
    padding: 16,
    borderRadius: 12,
    border: '2px solid #e9ecef',
    marginBottom: 16,
  },
  timer: { fontSize: 18, margin: '8px 0 4px', color: '#333' },
  expiresAt: { fontSize: 12, color: '#aaa', marginBottom: 14 },
  refreshBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 14,
  },
  hint: { fontSize: 12, color: '#999', lineHeight: 1.6 },
  errorBox: {
    color: '#e74c3c',
    background: '#fef0f0',
    borderRadius: 8,
    padding: 16,
    margin: '16px 0',
  },
  listPanel: {
    flex: 1,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    padding: 28,
    minWidth: 0,
  },
  listHeading: { fontSize: 18, fontWeight: 700, margin: '0 0 16px' },
  count: { color: '#4f46e5', fontWeight: 700 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 40 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9fa' },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    color: '#555',
    borderBottom: '2px solid #dee2e6',
  },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 14px', fontSize: 14 },
  center: { textAlign: 'center', marginTop: 60, color: '#888' },
};
