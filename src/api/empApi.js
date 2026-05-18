// Spring Boot 사원 API 호출 모듈
// REACT_APP_API_URL 환경변수 우선 사용, 없으면 Beanstalk URL 기본값 사용
const BASE_URL = (process.env.REACT_APP_API_URL ||
  'http://emp-management-env.eba-6np5dqgb.ap-northeast-2.elasticbeanstalk.com') + '/api';

// 사원 전체 목록 조회
export const fetchEmps = async () => {
  const response = await fetch(`${BASE_URL}/emps`);
  if (!response.ok) {
    throw new Error(`서버 오류 (${response.status}): 사원 목록을 불러오지 못했습니다.`);
  }
  return response.json();
};

// 사원 등록
export const createEmp = async (emp) => {
  const response = await fetch(`${BASE_URL}/emps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp),
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 등록에 실패했습니다.`);
};

// 사원 수정
export const updateEmp = async (empno, emp) => {
  const response = await fetch(`${BASE_URL}/emps/${empno}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp),
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 수정에 실패했습니다.`);
};

// 사원 삭제
export const deleteEmp = async (empno) => {
  const response = await fetch(`${BASE_URL}/emps/${empno}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 사원 삭제에 실패했습니다.`);
};

// 부서번호로 사원 목록 조회
export const fetchEmpsByDeptno = async (deptno) => {
  const response = await fetch(`${BASE_URL}/emps/dept/${deptno}`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 사원 조회에 실패했습니다.`);
  return response.json();
};
