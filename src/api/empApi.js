// Spring Boot 사원 API 호출 모듈
// Vercel rewrites를 통해 /api 경로를 Beanstalk으로 프록시
import { authFetch } from './apiClient';

const BASE_URL = '/api';

// 사원 단건 조회 (사원 본인 프로필용)
export const fetchEmpById = async (empno) => {
  const response = await authFetch(`${BASE_URL}/emps/${empno}`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 정보를 불러오지 못했습니다.`);
  return response.json();
};

// 사원 전체 목록 조회 (관리자 전용)
export const fetchEmps = async () => {
  const response = await authFetch(`${BASE_URL}/emps`);
  if (!response.ok) {
    throw new Error(`서버 오류 (${response.status}): 사원 목록을 불러오지 못했습니다.`);
  }
  return response.json();
};

// 상사 선택용 목록 조회 (인증된 모든 사용자 - 사번·이름·직책만 반환)
export const fetchMgrList = async () => {
  const response = await authFetch(`${BASE_URL}/emps/mgr-list`);
  if (!response.ok) return [];
  return response.json();
};

// 사원 등록
export const createEmp = async (emp) => {
  const response = await authFetch(`${BASE_URL}/emps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp),
  });
  if (response.status === 409) {
    const data = await response.json();
    throw new Error(data.message || '이미 사용 중인 사번입니다. 다른 사번을 입력해 주세요.');
  }
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 등록에 실패했습니다.`);
};

// 사원 수정
export const updateEmp = async (empno, emp) => {
  const response = await authFetch(`${BASE_URL}/emps/${empno}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp),
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 수정에 실패했습니다.`);
};

// 사원 삭제
export const deleteEmp = async (empno) => {
  const response = await authFetch(`${BASE_URL}/emps/${empno}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 삭제에 실패했습니다.`);
};

// 부서번호로 사원 목록 조회
export const fetchEmpsByDeptno = async (deptno) => {
  const response = await authFetch(`${BASE_URL}/emps/dept/${deptno}`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 사원 조회에 실패했습니다.`);
  return response.json();
};

// 사원 프로필 사진 업로드 (S3)
export const uploadPhoto = async (empno, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authFetch(`${BASE_URL}/emps/${empno}/photo`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`사진 업로드 실패 (${response.status})`);
  return response.json();
};

// 사원 목록 엑셀 내보내기 (S3 업로드 후 다운로드 URL 반환)
export const exportEmpsExcel = async () => {
  const response = await authFetch(`${BASE_URL}/emps/export`);
  if (!response.ok) throw new Error(`엑셀 내보내기 실패 (${response.status})`);
  return response.json(); // { url: "https://..." }
};

// 사원 목록 엑셀 업로드 → 일괄 등록
export const importEmpsExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authFetch(`${BASE_URL}/emps/import`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`업로드 실패 (${response.status})`);
  return response.json(); // { total, success, failed, errors[] }
};

// 사원 주소 조회
export const fetchEmpAddr = async (empno) => {
  const response = await authFetch(`${BASE_URL}/emps/${empno}/addr`);
  if (!response.ok) throw new Error(`주소 조회 실패 (${response.status})`);
  return response.json(); // { empno, zipcode, address, addrDetail }
};

// 사원 주소 저장
export const saveEmpAddr = async (empno, addr) => {
  const response = await authFetch(`${BASE_URL}/emps/${empno}/addr`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addr),
  });
  if (!response.ok) throw new Error(`주소 저장 실패 (${response.status})`);
};

// 부서별 급여 통계 조회 (평균, 최고, 최저, 사원 수)
export const fetchSalaryStats = async () => {
  const response = await authFetch(`${BASE_URL}/stats/salary`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 급여 통계를 불러오지 못했습니다.`);
  return response.json();
};
