import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { fetchCurrentQr, fetchTodayAttendance, fetchAbsentToday } from '../api/attendanceApi';

const QR_REFRESH_MS   = 30_000;  // 30초마다 토큰 갱신
const LIST_REFRESH_MS = 15_000;  // 15초마다 목록 갱신

const VERCEL_BASE = window.location.origin;

const STATUS_LABEL = {
  NORMAL:      { text: '정상',  color: '#28a745', bg: '#d4edda' },
  LATE:        { text: '지각',  color: '#e67e22', bg: '#fef3e2' },
  EARLY_LEAVE: { text: '조퇴',  color: '#e74c3c', bg: '#fde8e8' },
  ABSENT:      { text: '미출근', color: '#6c757d', bg: '#f0f0f0' },
};

export default function QrDisplayPage({ onDashboard }) {
  const [token,      setToken]      = useState(null);
  const [expiresAt,  setExpires]    = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [present,    setPresent]    = useState([]);   // 출근자
  const [absent,     setAbsent]     = useState([]);   // 미출근자
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState('present'); // 'present' | 'absent'

  const loadToken = useCallback(async () => {
    try {
      const data = await fetchCurrentQr();
      setToken(data.token);
      setExpires(data.expiresAt);
      const diff = Math.max(0, Math.floor((new Date(data.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
      setError('');
    } catch {
      setError('QR 토큰 로드 실패');
    }
  }, []);

  const loadLists = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([fetchTodayAttendance(), fetchAbsentToday()]);
      setPresent(p);
      setAbsent(a);
    } catch {
      // 조용히 처리
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadToken(), loadLists()]);
      setLoading(false);
    })();
  }, [loadToken, loadLists]);

  useEffect(() => {
    const id = setInterval(loadToken, QR_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadToken]);

  useEffect(() => {
    const id = setInterval(loadLists, LIST_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadLists]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft(s => { if (s <= 1) { loadToken(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft, loadToken]);

  const qrUrl = token ? `${VERCEL_BASE}?qr=${encodeURIComponent(token)}` : '';

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  if (loading) return <div style={s.center}>QR 코드 로딩 중...</div>;

  return (
    <div style={s.page}>

      {/* ── 왼쪽: QR 패널 ── */}
      <div style={s.qrPanel}>
        {onDashboard && (
          <button style={s.dashBtn} onClick={onDashboard}>← 대시보드</button>
        )}
        <h2 style={s.heading}>출퇴근 QR 코드</h2>
        <p style={s.date}>{todayStr}</p>

        {error ? (
          <div style={s.errorBox}>{error}</div>
        ) : (
          <>
            <div style={s.qrBox}>
              <QRCode value={qrUrl} size={210} />
            </div>
            <div style={s.timer}>만료까지: <strong>{secondsLeft}초</strong></div>
            <div style={s.expiresAt}>만료: {expiresAt}</div>
            <button style={s.refreshBtn} onClick={loadToken}>🔄 QR 새로고침</button>
            <p style={s.hint}>스마트폰으로 QR을 스캔하면<br />출퇴근이 자동으로 기록됩니다.</p>
          </>
        )}

        {/* 요약 통계 */}
        <div style={s.statsRow}>
          <div style={s.statBox}>
            <span style={{ color: '#28a745', fontWeight: 700, fontSize: 22 }}>{present.length}</span>
            <span style={s.statLabel}>출근</span>
          </div>
          <div style={s.statDiv} />
          <div style={s.statBox}>
            <span style={{ color: '#e74c3c', fontWeight: 700, fontSize: 22 }}>{absent.length}</span>
            <span style={s.statLabel}>미출근</span>
          </div>
          <div style={s.statDiv} />
          <div style={s.statBox}>
            <span style={{ color: '#333', fontWeight: 700, fontSize: 22 }}>{present.length + absent.length}</span>
            <span style={s.statLabel}>전체</span>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 출근/미출근 탭 ── */}
      <div style={s.listPanel}>
        <div style={s.tabBar}>
          <button
            style={activeTab === 'present' ? s.tabActive : s.tab}
            onClick={() => setActiveTab('present')}
          >
            ✅ 출근 현황 <span style={s.badge}>{present.length}</span>
          </button>
          <button
            style={activeTab === 'absent' ? s.tabActiveRed : s.tab}
            onClick={() => setActiveTab('absent')}
          >
            ⏳ 미출근 사원 <span style={{ ...s.badge, background: '#fee2e2', color: '#e74c3c' }}>{absent.length}</span>
          </button>
          <button style={s.refreshSmall} onClick={loadLists} title="새로고침">↻</button>
        </div>

        {/* 출근 현황 탭 */}
        {activeTab === 'present' && (
          present.length === 0 ? (
            <p style={s.empty}>아직 출근한 직원이 없습니다.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>이름</th>
                    <th style={s.th}>부서</th>
                    <th style={s.th}>출근</th>
                    <th style={s.th}>퇴근</th>
                    <th style={s.th}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {present.map(row => {
                    const st = STATUS_LABEL[row.status] || { text: row.status, color: '#555', bg: '#eee' };
                    return (
                      <tr key={row.attendId} style={s.tr}>
                        <td style={s.td}>{row.ename}</td>
                        <td style={s.td}>{row.dname}</td>
                        <td style={s.td}>{row.checkIn  || '-'}</td>
                        <td style={s.td}>{row.checkOut || '-'}</td>
                        <td style={s.td}>
                          <span style={{ background: st.bg, color: st.color, borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            {st.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* 미출근 탭 */}
        {activeTab === 'absent' && (
          absent.length === 0 ? (
            <p style={s.empty}>🎉 모든 직원이 출근했습니다!</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>이름</th>
                    <th style={s.th}>부서</th>
                    <th style={s.th}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {absent.map((row, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{row.ename}</td>
                      <td style={s.td}>{row.dname}</td>
                      <td style={s.td}>
                        <span style={{ background: '#fee2e2', color: '#e74c3c', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                          미출근
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const s = {
  page:     { display: 'flex', gap: 28, padding: '28px 20px', minHeight: '80vh', alignItems: 'flex-start' },
  center:   { textAlign: 'center', marginTop: 60, color: '#888' },

  /* QR 패널 */
  qrPanel: {
    flex: '0 0 300px',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    padding: '24px 24px 20px',
    textAlign: 'center',
  },
  dashBtn:   { display: 'block', marginBottom: 14, background: 'none', border: '1.5px solid #c7d2fe', borderRadius: 8, color: '#4f46e5', fontSize: 13, fontWeight: 600, padding: '6px 14px', cursor: 'pointer', textAlign: 'left' },
  heading:   { fontSize: 20, fontWeight: 700, margin: '0 0 4px' },
  date:      { color: '#888', fontSize: 13, marginBottom: 16 },
  qrBox:     { display: 'inline-block', background: '#fff', padding: 14, borderRadius: 12, border: '2px solid #e9ecef', marginBottom: 12 },
  timer:     { fontSize: 16, margin: '6px 0 2px', color: '#333' },
  expiresAt: { fontSize: 11, color: '#bbb', marginBottom: 10 },
  refreshBtn:{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 10 },
  hint:      { fontSize: 12, color: '#aaa', lineHeight: 1.6, margin: '0 0 16px' },
  errorBox:  { color: '#e74c3c', background: '#fef0f0', borderRadius: 8, padding: 14, margin: '12px 0' },

  /* 통계 */
  statsRow:  { display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#f8f9fa', borderRadius: 10, padding: '12px 8px', marginTop: 8 },
  statBox:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11, color: '#888' },
  statDiv:   { width: 1, height: 28, background: '#dee2e6' },

  /* 오른쪽 패널 */
  listPanel: { flex: 1, background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', padding: 24, minWidth: 0 },
  tabBar:    { display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' },
  tab: {
    background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8,
    padding: '9px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
  },
  tabActive: {
    background: '#eef2ff', color: '#4f46e5', border: '1.5px solid #c7d2fe', borderRadius: 8,
    padding: '9px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
  },
  tabActiveRed: {
    background: '#fef2f2', color: '#e74c3c', border: '1.5px solid #fca5a5', borderRadius: 8,
    padding: '9px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
  },
  badge:       { background: '#e0e7ff', color: '#4f46e5', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 700 },
  refreshSmall:{ marginLeft: 'auto', background: 'none', border: '1px solid #dee2e6', borderRadius: 8, color: '#666', fontSize: 18, padding: '4px 10px', cursor: 'pointer' },

  tableWrap: { overflowX: 'auto' },
  table:  { width: '100%', borderCollapse: 'collapse' },
  thead:  { background: '#f8f9fa' },
  th:     { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#555', borderBottom: '2px solid #dee2e6' },
  tr:     { borderBottom: '1px solid #f5f5f5' },
  td:     { padding: '10px 14px', fontSize: 14 },
  empty:  { color: '#aaa', textAlign: 'center', padding: 48, fontSize: 15 },
};
