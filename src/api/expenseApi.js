import { authFetch } from './apiClient';

const BASE = '/api/expenses';

// ─── 사원 ───

// OCR 분석 (이미지 업로드 → 금액/날짜 파싱)
export const parseReceipt = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetch(`${BASE}/parse`, { method: 'POST', body: formData })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
};

// 지출 등록 (409 = 중복 영수증)
export const createExpense = async (expense) => {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (res.status === 409) {
    const data = await res.json();
    throw new Error(data.error || '이미 제출된 영수증입니다.');
  }
  return res;
};

// 내 지출 목록
export const fetchMyExpenses = () =>
  authFetch(`${BASE}/my`).then(r => r.json());

// ─── 관리자 ───

// 월별 지출 목록
export const fetchExpensesByMonth = (year, month) =>
  authFetch(`${BASE}?year=${year}&month=${month}`).then(r => r.json());

// 확인 처리
export const confirmExpense = (expenseId) =>
  authFetch(`${BASE}/${expenseId}/confirm`, { method: 'PATCH' });

// 삭제
export const deleteExpense = (expenseId) =>
  authFetch(`${BASE}/${expenseId}`, { method: 'DELETE' });

// 월별 통계 조회
export const fetchMonthlyStats = (year, month) =>
  authFetch(`${BASE}/stats/monthly?year=${year}&month=${month}`).then(r => r.json());

// 연별 통계 조회
export const fetchYearlyStats = (year) =>
  authFetch(`${BASE}/stats/yearly?year=${year}`).then(r => r.json());

// 월별 통계 수동 생성
export const generateMonthlyStats = (year, month) =>
  authFetch(`${BASE}/stats/monthly/generate?year=${year}&month=${month}`, { method: 'POST' });

// 연별 통계 수동 생성
export const generateYearlyStats = (year) =>
  authFetch(`${BASE}/stats/yearly/generate?year=${year}`, { method: 'POST' });

// 엑셀 다운로드 공통 헬퍼
const downloadExcel = async (url, filename) => {
  const res = await authFetch(url);
  if (!res.ok) throw new Error(res.status);
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadDetailExcel   = (year, month) =>
  downloadExcel(`${BASE}/excel/detail?year=${year}&month=${month}`,
                `expense-detail-${year}${String(month).padStart(2,'0')}.xlsx`);

export const downloadMonthlyExcel  = (year, month) =>
  downloadExcel(`${BASE}/excel/monthly?year=${year}&month=${month}`,
                `expense-monthly-${year}${String(month).padStart(2,'0')}.xlsx`);

export const downloadYearlyExcel   = (year) =>
  downloadExcel(`${BASE}/excel/yearly?year=${year}`,
                `expense-yearly-${year}.xlsx`);
