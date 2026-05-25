const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

/** 현재 유효한 QR 토큰 조회 (관리자) */
export async function fetchCurrentQr() {
  const res = await fetch(`${BASE}/api/qr/current`);
  if (!res.ok) throw new Error('QR 토큰 조회 실패');
  return res.json();
}

/** QR 스캔 처리 (직원) */
export async function scanQr(token, empno) {
  const res = await fetch(
    `${BASE}/api/qr/scan?token=${encodeURIComponent(token)}&empno=${empno}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('스캔 처리 실패');
  return res.json();
}

/** 직원 월별 출근 기록 */
export async function fetchMyAttendance(empno, month) {
  const params = new URLSearchParams({ empno });
  if (month) params.append('month', month);
  const res = await fetch(`${BASE}/api/attendance/my?${params}`);
  if (!res.ok) throw new Error('출근 기록 조회 실패');
  return res.json();
}

/** 관리자 전체 출근 기록 */
export async function fetchAdminAttendance(date, deptno) {
  const params = new URLSearchParams();
  if (date)   params.append('date',   date);
  if (deptno) params.append('deptno', deptno);
  const res = await fetch(`${BASE}/api/attendance/admin?${params}`);
  if (!res.ok) throw new Error('출근 기록 조회 실패');
  return res.json();
}

/** 오늘 전체 출근 현황 */
export async function fetchTodayAttendance() {
  const res = await fetch(`${BASE}/api/attendance/today`);
  if (!res.ok) throw new Error('오늘 출근 현황 조회 실패');
  return res.json();
}
