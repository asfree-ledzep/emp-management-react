// Vercel rewrites를 통해 /api 경로를 Beanstalk으로 프록시
import { authFetch } from './apiClient';

const BASE = '/api';

/** 현재 유효한 QR 토큰 조회 (관리자) */
export async function fetchCurrentQr() {
  const res = await authFetch(`${BASE}/qr/current`);
  if (!res.ok) throw new Error('QR 토큰 조회 실패');
  return res.json();
}

/** QR 스캔 처리 (직원) */
export async function scanQr(token, empno) {
  const res = await authFetch(
    `${BASE}/qr/scan?token=${encodeURIComponent(token)}&empno=${empno}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('스캔 처리 실패');
  return res.json();
}

/** 직원 월별 출근 기록 */
export async function fetchMyAttendance(empno, month) {
  const params = new URLSearchParams({ empno });
  if (month) params.append('month', month);
  const res = await authFetch(`${BASE}/attendance/my?${params}`);
  if (!res.ok) throw new Error('출근 기록 조회 실패');
  return res.json();
}

/** 관리자 전체 출근 기록 */
export async function fetchAdminAttendance(date, deptno) {
  const params = new URLSearchParams();
  if (date)   params.append('date',   date);
  if (deptno) params.append('deptno', deptno);
  const res = await authFetch(`${BASE}/attendance/admin?${params}`);
  if (!res.ok) throw new Error('출근 기록 조회 실패');
  return res.json();
}

/** 오늘 전체 출근 현황 */
export async function fetchTodayAttendance() {
  const res = await authFetch(`${BASE}/attendance/today`);
  if (!res.ok) throw new Error('오늘 출근 현황 조회 실패');
  return res.json();
}

/** 오늘 미출근 사원 목록 */
export async function fetchAbsentToday() {
  const res = await authFetch(`${BASE}/attendance/absent-today`);
  if (!res.ok) throw new Error('미출근 사원 조회 실패');
  return res.json();
}

/** 월별 직원별 근태 누계 (근퇴불량자 분석) */
export async function fetchMonthlyStats(month) {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const res = await authFetch(`${BASE}/attendance/monthly-stats?${params}`);
  if (!res.ok) throw new Error('근태 통계 조회 실패');
  return res.json();
}

/** 강제 QR 새 토큰 발급 (관리자 🔄 버튼용) */
export async function forceGenerateQr() {
  const res = await authFetch(`${BASE}/qr/generate`, { method: 'POST' });
  if (!res.ok) throw new Error('QR 토큰 생성 실패');
  return res.json();
}

/** 출근 마감 시간 조회 */
export async function fetchCheckInConfig() {
  const res = await authFetch(`${BASE}/attendance/config/checkin-time`);
  if (!res.ok) throw new Error('설정 조회 실패');
  return res.json();
}

/** 출근 마감 시간 변경 */
export async function updateCheckInTime(time) {
  const res = await authFetch(
    `${BASE}/attendance/config/checkin-time?time=${encodeURIComponent(time)}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('설정 변경 실패');
  return res.json();
}
