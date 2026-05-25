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

  const totalDays  = list.length;
  const totalMins  = list.reduce((s, r) => s + (r.workMinutes || 0), 0);
  const lateDays   = list.filter(r => r.status === 'LATE').length;

  return (
    <div>
      {/* 필터 */}
      <div style={styles.filterRow}>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={styles.monthInput}
        />
        <button style={styles.searchBtn} onClick={load}>조회</button>
      </div>

      {/* 요약 카드 */}
      <div style={styles.summaryRow}>
        <SummaryCard label="출근 일수" value={`${totalDays}일`} color="#4f46e5" />
        <SummaryCard label="총 근무시간" value={formatMinutes(totalMins)} color="#28a745" />
        <SummaryCard label="지각" value={`${lateDays}회`} color="#e67e22" />
      </div>

      {/* 테이블 */}
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
  const [date, setDate]     = useState(today);
  const [deptno, setDeptno] = useState('');
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(false);

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
      <div style={styles.filterRow}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={styles.dateInput}
        />
        <select
          value={deptno}
          onChange={e => setDeptno(e.target.value)}
          style={styles.select}
        >
          <option value="">전체 부서</option>
          <option value="10">ACCOUNTING</option>
          <option value="20">RESEARCH</option>
          <option value="30">SALES</option>
          <option value="40">OPERATIONS</option>
        </select>
        <button style={styles.searchBtn} onClick={load}>조회</button>
      </div>
      {loading ? (
        <p style={styles.loading}>로딩 중...</p>
      ) : list.length === 0 ? (
        <p style={styles.empty}>조회된 기록이 없습니다.</p>
      ) : (
        <AttendanceTable rows={list} showName showDept />
      )}
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
                  <span style={{
                    background: st.bg,
                    color: st.color,
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
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
export default function AttendancePage({ user }) {
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState(isAdmin ? 'admin' : 'my');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>출퇴근 기록</h2>
        {isAdmin && (
          <div style={styles.tabRow}>
            <button
              style={tab === 'my' ? styles.tabActive : styles.tab}
              onClick={() => setTab('my')}
            >내 기록</button>
            <button
              style={tab === 'admin' ? styles.tabActive : styles.tab}
              onClick={() => setTab('admin')}
            >전체 조회</button>
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

const styles = {
  page: { padding: '28px 24px', maxWidth: 960, margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  tabRow: { display: 'flex', gap: 8 },
  tab: {
    background: '#f0f0f0', color: '#555',
    border: 'none', borderRadius: 8, padding: '8px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  tabActive: {
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 8, padding: '8px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  body: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    padding: 28,
  },
  filterRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  monthInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  dateInput:  { padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  select:     { padding: '8px 12px', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 14 },
  searchBtn:  {
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 8, padding: '8px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  summaryRow: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  summaryCard: {
    flex: '1 1 120px',
    background: '#fafafa',
    borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  tableWrap: { overflowX: 'auto' },
  table:  { width: '100%', borderCollapse: 'collapse' },
  thead:  { background: '#f8f9fa' },
  th:     { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#555', borderBottom: '2px solid #dee2e6' },
  tr:     { borderBottom: '1px solid #f0f0f0' },
  td:     { padding: '10px 14px', fontSize: 14 },
  loading: { textAlign: 'center', color: '#888', padding: 40 },
  empty:   { textAlign: 'center', color: '#aaa', padding: 40 },
};
