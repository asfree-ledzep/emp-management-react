import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  fetchCurrentQr,
  forceGenerateQr,
  fetchTodayAttendance,
  fetchAbsentToday,
  fetchCheckInConfig,
  updateCheckInTime,
} from '../api/attendanceApi';

const QR_REFRESH_MS   = 30_000;  // 30초마다 토큰 자동 갱신 체크
const LIST_REFRESH_MS = 15_000;  // 15초마다 목록 갱신
const TOKEN_DURATION  = 300;     // QR 토큰 유효시간 5분(고정)

const VERCEL_BASE = window.location.origin;

const STATUS_LABEL = {
  NORMAL:      { text: '정상',  color: '#28a745', bg: '#d4edda' },
  LATE:        { text: '지각',  color: '#e67e22', bg: '#fef3e2' },
  EARLY_LEAVE: { text: '조퇴',  color: '#e74c3c', bg: '#fde8e8' },
  ABSENT:      { text: '미출근', color: '#6c757d', bg: '#f0f0f0' },
};

/* ─────────── 출근 시간 설정 모달 ─────────── */
function CheckInTimeModal({ current, onSave, onClose }) {
  const [time, setTime] = useState(current || '09:00');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await updateCheckInTime(time);
      setMsg(res.message || '변경 완료');
      setTimeout(() => { onSave(time); onClose(); }, 800);
    } catch (e) {
      setMsg('변경 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cm.overlay} onClick={onClose}>
      <div style={cm.modal} onClick={e => e.stopPropagation()}>
        <h3 style={cm.title}>⏰ 출근 마감 시간 설정</h3>
        <p style={cm.desc}>
          이 시각 이후 QR 스캔 시 <strong style={{ color: '#e67e22' }}>지각</strong>으로 처리됩니다.<br />
          (서버 재시작 시 09:00으로 초기화)
        </p>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          style={cm.timeInput}
        />
        {msg && <p style={{ color: msg.includes('실패') ? '#e74c3c' : '#28a745', fontSize: 13, margin: '8px 0 0' }}>{msg}</p>}
        <div style={cm.btnRow}>
          <button style={cm.cancelBtn} onClick={onClose}>취소</button>
          <button style={cm.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 메인 QR 화면 ─────────── */
export default function QrDisplayPage({ onDashboard }) {
  const [token,       setToken]       = useState(null);
  const [expiresAt,   setExpires]     = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_DURATION);
  const [present,     setPresent]     = useState([]);
  const [absent,      setAbsent]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [activeTab,   setActiveTab]   = useState('present');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [showTimeModal, setShowTimeModal] = useState(false);

  /* ── 강제 새 QR 발급 (🔄 버튼 또는 만료 시) ── */
  const generateNewToken = useCallback(async () => {
    try {
      const data = await forceGenerateQr();
      setToken(data.token);
      setExpires(data.expiresAt);
      setSecondsLeft(TOKEN_DURATION); // 항상 5분으로 리셋
      setError('');
    } catch {
      setError('QR 토큰 생성 실패');
    }
  }, []);

  /* ── 현재 유효 토큰 조회 (최초 로드 & 30초 자동 체크) ── */
  const loadToken = useCallback(async () => {
    try {
      const data = await fetchCurrentQr();
      setToken(data.token);
      setExpires(data.expiresAt);
      // 남은 시간 계산 (Oracle UTC 기준)
      const expiryMs = new Date(data.expiresAt.replace(' ', 'T') + 'Z').getTime();
      const diff = Math.floor((expiryMs - Date.now()) / 1000);
      if (diff > 0) {
        setSecondsLeft(diff);
      } else {
        // 만료됨 → 강제 새 발급
        await generateNewToken();
      }
      setError('');
    } catch {
      setError('QR 토큰 로드 실패');
    }
  }, [generateNewToken]);

  /* ── 목록 갱신 ── */
  const loadLists = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([fetchTodayAttendance(), fetchAbsentToday()]);
      setPresent(p);
      setAbsent(a);
    } catch { /* 조용히 */ }
  }, []);

  /* ── 출근 시간 설정 로드 ── */
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await fetchCheckInConfig();
      setCheckInTime(cfg.checkInDeadline || '09:00');
    } catch { /* 기본값 유지 */ }
  }, []);

  /* ── 최초 로드 ── */
  useEffect(() => {
    (async () => {
      await Promise.all([loadToken(), loadLists(), loadConfig()]);
      setLoading(false);
    })();
  }, [loadToken, loadLists, loadConfig]);

  /* ── 30초마다 토큰 상태 체크 ── */
  useEffect(() => {
    const id = setInterval(loadToken, QR_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadToken]);

  /* ── 15초마다 목록 갱신 ── */
  useEffect(() => {
    const id = setInterval(loadLists, LIST_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadLists]);

  /* ── 1초 카운트다운 ── */
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  /* ── 0초 도달 → 강제 새 토큰 발급 ── */
  useEffect(() => {
    if (secondsLeft === 0 && !loading) {
      generateNewToken();
    }
  }, [secondsLeft, loading, generateNewToken]);

  const qrUrl = token ? `${VERCEL_BASE}?qr=${encodeURIComponent(token)}` : '';

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  /* 카운트다운 색상 */
  const timerColor = secondsLeft <= 30 ? '#e74c3c' : secondsLeft <= 60 ? '#e67e22' : '#333';

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

        {/* 출근 마감 시간 표시 + 설정 버튼 */}
        <div style={s.checkInRow}>
          <span style={s.checkInLabel}>출근 마감</span>
          <span style={s.checkInTime}>{checkInTime}</span>
          <button style={s.timeBtn} onClick={() => setShowTimeModal(true)} title="출근 마감 시간 변경">
            ✏️ 변경
          </button>
        </div>

        {error ? (
          <div style={s.errorBox}>{error}</div>
        ) : (
          <>
            <div style={s.qrBox}>
              <QRCode value={qrUrl} size={210} />
            </div>
            <div style={{ ...s.timer, color: timerColor }}>
              만료까지: <strong>{secondsLeft}초</strong>
            </div>
            <div style={s.expiresAt}>만료: {expiresAt}</div>
            {/* 🔄 버튼 → 강제 새 토큰 발급 */}
            <button style={s.refreshBtn} onClick={generateNewToken}>🔄 QR 새로고침</button>
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

      {/* 출근 시간 설정 모달 */}
      {showTimeModal && (
        <CheckInTimeModal
          current={checkInTime}
          onSave={setCheckInTime}
          onClose={() => setShowTimeModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────── 스타일 ─────────── */
const s = {
  page:     { display: 'flex', gap: 28, padding: '28px 20px', minHeight: '80vh', alignItems: 'flex-start' },
  center:   { textAlign: 'center', marginTop: 60, color: '#888' },

  qrPanel: {
    flex: '0 0 310px',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    padding: '24px 24px 20px',
    textAlign: 'center',
  },
  dashBtn:    { display: 'block', marginBottom: 14, background: 'none', border: '1.5px solid #c7d2fe', borderRadius: 8, color: '#4f46e5', fontSize: 13, fontWeight: 600, padding: '6px 14px', cursor: 'pointer', textAlign: 'left' },
  heading:    { fontSize: 20, fontWeight: 700, margin: '0 0 4px' },
  date:       { color: '#888', fontSize: 13, marginBottom: 12 },

  /* 출근 마감 시간 영역 */
  checkInRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fef3e2', borderRadius: 10, padding: '8px 14px', marginBottom: 14 },
  checkInLabel:{ fontSize: 12, color: '#888' },
  checkInTime: { fontSize: 16, fontWeight: 700, color: '#e67e22' },
  timeBtn:    { background: 'none', border: '1px solid #f0c06a', borderRadius: 6, color: '#c07020', fontSize: 11, fontWeight: 600, padding: '3px 8px', cursor: 'pointer' },

  qrBox:     { display: 'inline-block', background: '#fff', padding: 14, borderRadius: 12, border: '2px solid #e9ecef', marginBottom: 12 },
  timer:     { fontSize: 16, margin: '6px 0 2px', fontWeight: 600, transition: 'color 0.3s' },
  expiresAt: { fontSize: 11, color: '#bbb', marginBottom: 10 },
  refreshBtn:{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 10 },
  hint:      { fontSize: 12, color: '#aaa', lineHeight: 1.6, margin: '0 0 16px' },
  errorBox:  { color: '#e74c3c', background: '#fef0f0', borderRadius: 8, padding: 14, margin: '12px 0' },

  statsRow:  { display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#f8f9fa', borderRadius: 10, padding: '12px 8px', marginTop: 8 },
  statBox:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 11, color: '#888' },
  statDiv:   { width: 1, height: 28, background: '#dee2e6' },

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

/* ─────────── 출근 시간 설정 모달 스타일 ─────────── */
const cm = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:     { background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  title:     { fontSize: 18, fontWeight: 700, margin: '0 0 10px' },
  desc:      { fontSize: 13, color: '#666', lineHeight: 1.7, margin: '0 0 18px' },
  timeInput: { width: '100%', padding: '12px', fontSize: 20, borderRadius: 10, border: '2px solid #dee2e6', textAlign: 'center', fontWeight: 700, color: '#333', marginBottom: 4 },
  btnRow:    { display: 'flex', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #dee2e6', background: '#f8f9fa', color: '#555', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  saveBtn:   { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};
