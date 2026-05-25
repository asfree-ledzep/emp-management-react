import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyAttendance, fetchAdminAttendance } from '../api/attendanceApi';

const STATUS_LABEL = {
  NORMAL:      { text: '정상',  color: '#28a745', bg: '#d4edda' },
  LATE:        { text: '지각',  color: '#e67e22', bg: '#fef3e2' },
  EARLY_LEAVE: { text: '조퇴',  color: '#e74c3c', bg: '#fde8e8' },
  ABSENT:      { text: '결근',  color: '#6c757d', bg: '#f0f0f0' },
};

function formatMinutes(mins) {
  if (!mins) return '-';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ──────────────────────── 통계 모달 ──────────────────────── */
function StatsModal({ list, onClose }) {
  const total     = list.length;
  const normal    = list.filter(r => r.status === 'NORMAL').length;
  const late      = list.filter(r => r.status === 'LATE').length;
  const earlyLeave= list.filter(r => r.status === 'EARLY_LEAVE').length;
  const checkedOut= list.filter(r => r.checkOut).length;
  const totalMins = list.reduce((s, r) => s + (r.workMinutes || 0), 0);
  const avgMins   = total > 0 ? Math.round(totalMins / total) : 0;

  // 부서별 집계
  const byDept = list.reduce((acc, r) => {
    const d = r.dname || '미배정';
    if (!acc[d]) acc[d] = { total: 0, late: 0, mins: 0 };
    acc[d].total++;
    if (r.status === 'LATE') acc[d].late++;
    acc[d].mins += r.workMinutes || 0;
    return acc;
  }, {});

  // 시간대별 출근 분포 (시간 단위)
  const byHour = list.reduce((acc, r) => {
    if (!r.checkIn) return acc;
    const h = r.checkIn.split(':')[0];
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {});
  const hours = Object.keys(byHour).sort();
  const maxCount = Math.max(...Object.values(byHour), 1);

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>
        <div style={m.header}>
          <h3 style={m.title}>📊 출근 통계</h3>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 전체 요약 카드 */}
        <div style={m.cardRow}>
          <StatCard label="전체 기록" value={total}             color="#4f46e5" icon="📋" />
          <StatCard label="정상"     value={normal}            color="#28a745" icon="✅" />
          <StatCard label="지각"     value={late}              color="#e67e22" icon="⏰" />
          <StatCard label="조퇴"     value={earlyLeave}        color="#e74c3c" icon="🚪" />
          <StatCard label="퇴근 완료" value={checkedOut}       color="#0891b2" icon="🏠" />
          <StatCard label="평균 근무" value={formatMinutes(avgMins)} color="#7c3aed" icon="⏱️" />
        </div>

        {/* 상태 비율 바 */}
        {total > 0 && (
          <div style={m.section}>
            <div style={m.sectionTitle}>상태 비율</div>
            <div style={m.barWrap}>
              {normal     > 0 && <div style={{ ...m.barSeg, width: `${(normal/total)*100}%`,     background: '#28a745' }} title={`정상 ${normal}명`} />}
              {late       > 0 && <div style={{ ...m.barSeg, width: `${(late/total)*100}%`,       background: '#e67e22' }} title={`지각 ${late}명`} />}
              {earlyLeave > 0 && <div style={{ ...m.barSeg, width: `${(earlyLeave/total)*100}%`, background: '#e74c3c' }} title={`조퇴 ${earlyLeave}명`} />}
            </div>
            <div style={m.legend}>
              <span style={m.dot('#28a745')} />정상 {normal}
              <span style={{ ...m.dot('#e67e22'), marginLeft: 12 }} />지각 {late}
              <span style={{ ...m.dot('#e74c3c'), marginLeft: 12 }} />조퇴 {earlyLeave}
            </div>
          </div>
        )}

        {/* 시간대별 출근 분포 */}
        {hours.length > 0 && (
          <div style={m.section}>
            <div style={m.sectionTitle}>시간대별 출근 현황</div>
            <div style={m.chartRow}>
              {hours.map(h => (
                <div key={h} style={m.barCol}>
                  <div style={m.barColLabel}>{byHour[h]}명</div>
                  <div style={m.barColBar}>
                    <div style={{
                      ...m.barColFill,
                      height: `${Math.round((byHour[h] / maxCount) * 100)}%`,
                      background: parseInt(h) >= 9 ? '#e67e22' : '#4f46e5',
                    }} />
                  </div>
                  <div style={m.barColHour}>{h}시</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
              🟦 9시 이전(정상) &nbsp; 🟧 9시 이후(지각)
            </div>
          </div>
        )}

        {/* 부서별 집계 */}
        {Object.keys(byDept).length > 0 && (
          <div style={m.section}>
            <div style={m.sectionTitle}>부서별 집계</div>
            <table style={m.table}>
              <thead>
                <tr style={m.thead}>
                  <th style={m.th}>부서</th>
                  <th style={m.th}>인원</th>
                  <th style={m.th}>지각</th>
                  <th style={m.th}>평균 근무</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byDept).map(([dept, d]) => (
                  <tr key={dept} style={m.tr}>
                    <td style={m.td}>{dept}</td>
                    <td style={m.td}>{d.total}명</td>
                    <td style={{ ...m.td, color: d.late > 0 ? '#e67e22' : '#333' }}>
                      {d.late > 0 ? `${d.late}명` : '-'}
                    </td>
                    <td style={m.td}>{formatMinutes(Math.round(d.mins / d.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...m.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 12 }}>{label}</div>
    </div>
  );
}

/* ──────────────────────── 직원용 ──────────────────────── */
function MyAttendanceTab({ user }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth]   = useState(defaultMonth);
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.empno) return;
    setLoading(true);
    try {
      const data = await fetchMyAttendance(user.empno, month);
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [user, month]);

  useEffect(() => { load(); }, [load]);

  const totalDays = list.length;
  const totalMins = list.reduce((s, r) => s + (r.workMinutes || 0), 0);
  const lateDays  = list.filter(r => r.status === 'LATE').length;

  return (
    <div>
      <div style={styles.filterRow}>
        <input type="month" value={month}
          onChange={e => setMonth(e.target.value)} style={styles.monthInput} />
        <button style={styles.searchBtn} onClick={load}>조회</button>
      </div>
      <div style={styles.summaryRow}>
        <SummaryCard label="출근 일수"  value={`${totalDays}일`}        color="#4f46e5" />
        <SummaryCard label="총 근무시간" value={formatMinutes(totalMins)} color="#28a745" />
        <SummaryCard label="지각"       value={`${lateDays}회`}         color="#e67e22" />
      </div>
      {loading ? (
        <p style={styles.loading}>로딩 중...</p>
      ) : list.length === 0 ? (
        <p style={styles.empty}>해당 월에 출근 기록이 없습니다.</p>
      ) : (
        <AttendanceTable rows={list} />
      )}
    </div>
  );
}

/* ──────────────────────── 관리자용 ──────────────────────── */
function AdminAttendanceTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [date,    setDate]    = useState(today);
  const [deptno,  setDeptno]  = useState('');
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAttendance(date || null, deptno || null);
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [date, deptno]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* 필터 + 통계 버튼 */}
      <div style={styles.filterRow}>
        <input type="date" value={date}
          onChange={e => setDate(e.target.value)} style={styles.dateInput} />
        <select value={deptno} onChange={e => setDeptno(e.target.value)} style={styles.select}>
          <option value="">전체 부서</option>
          <option value="10">ACCOUNTING</option>
          <option value="20">RESEARCH</option>
          <option value="30">SALES</option>
          <option value="40">OPERATIONS</option>
        </select>
        <button style={styles.searchBtn} onClick={load}>조회</button>
        <button
          style={styles.statsBtn}
          onClick={() => setShowStats(true)}
          disabled={list.length === 0}
          title={list.length === 0 ? '먼저 데이터를 조회하세요' : '통계 보기'}
        >
          📊 통계
        </button>
      </div>

      {/* 결과 요약 바 */}
      {list.length > 0 && (
        <div style={styles.miniSummary}>
          <span style={styles.miniItem}>전체 <strong>{list.length}</strong>건</span>
          <span style={styles.miniItem}>
            정상 <strong style={{ color: '#28a745' }}>{list.filter(r => r.status === 'NORMAL').length}</strong>
          </span>
          <span style={styles.miniItem}>
            지각 <strong style={{ color: '#e67e22' }}>{list.filter(r => r.status === 'LATE').length}</strong>
          </span>
          <span style={styles.miniItem}>
            조퇴 <strong style={{ color: '#e74c3c' }}>{list.filter(r => r.status === 'EARLY_LEAVE').length}</strong>
          </span>
          <span style={styles.miniItem}>
            퇴근완료 <strong style={{ color: '#0891b2' }}>{list.filter(r => r.checkOut).length}</strong>
          </span>
        </div>
      )}

      {loading ? (
        <p style={styles.loading}>로딩 중...</p>
      ) : list.length === 0 ? (
        <p style={styles.empty}>조회된 기록이 없습니다.</p>
      ) : (
        <AttendanceTable rows={list} showName showDept />
      )}

      {showStats && <StatsModal list={list} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ──────────────────────── 공통 컴포넌트 ──────────────────────── */
function SummaryCard({ label, value, color }) {
  return (
    <div style={{ ...styles.summaryCard, borderTop: `4px solid ${color}` }}>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function AttendanceTable({ rows, showName, showDept }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            {showName && <th style={styles.th}>이름</th>}
            {showDept && <th style={styles.th}>부서</th>}
            <th style={styles.th}>날짜</th>
            <th style={styles.th}>출근</th>
            <th style={styles.th}>퇴근</th>
            <th style={styles.th}>근무시간</th>
            <th style={styles.th}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const st = STATUS_LABEL[row.status] || { text: row.status, color: '#555', bg: '#eee' };
            return (
              <tr key={row.attendId} style={styles.tr}>
                {showName && <td style={styles.td}>{row.ename}</td>}
                {showDept && <td style={styles.td}>{row.dname}</td>}
                <td style={styles.td}>{row.workDate}</td>
                <td style={styles.td}>{row.checkIn  || '-'}</td>
                <td style={styles.td}>{row.checkOut || '-'}</td>
                <td style={styles.td}>{formatMinutes(row.workMinutes)}</td>
                <td style={styles.td}>
                  <span style={{ background: st.bg, color: st.color, borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                    {st.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────── 메인 페이지 ──────────────────────── */
export default function AttendancePage({ user, onDashboard }) {
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState(isAdmin ? 'admin' : 'my');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          {onDashboard && (
            <button style={styles.dashBtn} onClick={onDashboard}>← 대시보드</button>
          )}
          <h2 style={styles.title}>출퇴근 기록</h2>
        </div>
        {isAdmin && (
          <div style={styles.tabRow}>
            <button style={tab === 'my'    ? styles.tabActive : styles.tab} onClick={() => setTab('my')}>내 기록</button>
            <button style={tab === 'admin' ? styles.tabActive : styles.tab} onClick={() => setTab('admin')}>전체 조회</button>
          </div>
        )}
      </div>

      <div style={styles.body}>
        {tab === 'my'    && <MyAttendanceTab user={user} />}
        {tab === 'admin' && <AdminAttendanceTab />}
      </div>
    </div>
  );
}

/* ──────────────────────── 스타일 ──────────────────────── */
const styles = {
  page:     { padding: '28px 24px', maxWidth: 960, margin: '0 auto' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  title:    { fontSize: 22, fontWeight: 700, margin: 0 },
  dashBtn:  { background: 'none', border: '1.5px solid #c7d2fe', borderRadius: 8, color: '#4f46e5', fontSize: 13, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' },
  tabRow:   { display: 'flex', gap: 8 },
  tab:      { background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  tabActive:{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  body:     { background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 28 },
  filterRow:{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  monthInput:{ padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  dateInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  select:    { padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  searchBtn: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  statsBtn:  { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: 1 },
  miniSummary:{ display: 'flex', gap: 20, marginBottom: 16, padding: '10px 16px', background: '#f8f9fa', borderRadius: 10, flexWrap: 'wrap' },
  miniItem:  { fontSize: 13, color: '#555' },
  summaryRow:{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  summaryCard:{ flex: '1 1 120px', background: '#fafafa', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  thead:     { background: '#f8f9fa' },
  th:        { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#555', borderBottom: '2px solid #dee2e6' },
  tr:        { borderBottom: '1px solid #f0f0f0' },
  td:        { padding: '10px 14px', fontSize: 14 },
  loading:   { textAlign: 'center', color: '#888', padding: 40 },
  empty:     { textAlign: 'center', color: '#aaa', padding: 40 },
};

/* 모달 스타일 */
const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:   { background: '#fff', borderRadius: 20, padding: 28, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn:{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', padding: '4px 8px' },
  cardRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  statCard:{ flex: '1 1 90px', background: '#fafafa', borderRadius: 10, padding: '12px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 },
  barWrap: { height: 28, borderRadius: 8, overflow: 'hidden', background: '#f0f0f0', display: 'flex' },
  barSeg:  { height: '100%', transition: 'width 0.4s ease' },
  legend:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666', marginTop: 8 },
  dot: (c) => ({ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, marginRight: 4 }),
  chartRow:{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100, padding: '0 4px' },
  barCol:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  barColLabel:{ fontSize: 10, color: '#888' },
  barColBar:  { flex: 1, width: '100%', background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  barColFill: { width: '100%', borderRadius: 4, minHeight: 4, transition: 'height 0.4s ease' },
  barColHour: { fontSize: 11, color: '#555' },
  table:   { width: '100%', borderCollapse: 'collapse' },
  thead:   { background: '#f8f9fa' },
  th:      { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#555', borderBottom: '2px solid #dee2e6' },
  tr:      { borderBottom: '1px solid #f5f5f5' },
  td:      { padding: '8px 12px', fontSize: 13 },
};
