const BASE_URL = '/api';

export const fetchDepts = async () => {
  const response = await fetch(`${BASE_URL}/depts`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 목록을 불러오지 못했습니다.`);
  return response.json();
};

export const fetchDept = async (deptno) => {
  const response = await fetch(`${BASE_URL}/depts/${deptno}`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 정보를 불러오지 못했습니다.`);
  return response.json();
};

export const fetchEmpsByDept = async (deptno) => {
  const response = await fetch(`${BASE_URL}/depts/${deptno}/emps`);
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 사원 목록을 불러오지 못했습니다.`);
  return response.json();
};

export const createDept = async (dept) => {
  const response = await fetch(`${BASE_URL}/depts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dept),
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 등록에 실패했습니다.`);
};

export const updateDept = async (deptno, dept) => {
  const response = await fetch(`${BASE_URL}/depts/${deptno}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dept),
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 수정에 실패했습니다.`);
};

export const deleteDept = async (deptno) => {
  const response = await fetch(`${BASE_URL}/depts/${deptno}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`서버 오류 (${response.status}): 부서 삭제에 실패했습니다.`);
};
