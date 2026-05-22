// 인증 토큰을 포함한 fetch 래퍼
// sessionStorage 사용: 같은 탭 내 새로고침은 유지되지만 탭 간 토큰 공유 방지
// 401 응답 시 자동으로 로그아웃 처리

export const getToken = () => sessionStorage.getItem('token');

export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 토큰 만료 / 미인증 → 자동 로그아웃
  if (response.status === 401) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('empno');
    window.location.reload();
  }

  return response;
};
