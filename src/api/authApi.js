import { authFetch } from './apiClient';

const BASE_URL = '/api';

// 로그인 (관리자: 아이디/비밀번호, 사원: 사번/비밀번호)
export const login = async (username, password) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || '로그인에 실패했습니다.');
  }
  return data; // { token, username, role, empno? }
};

// 사원 비밀번호 설정 (관리자 전용)
export const setEmpPassword = async (empno, password) => {
  const response = await authFetch(`${BASE_URL}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empno, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || '비밀번호 설정에 실패했습니다.');
  }
};
