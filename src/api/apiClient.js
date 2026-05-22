// 인증 토큰을 포함한 fetch 래퍼
// sessionStorage 사용: 같은 탭 내 새로고침은 유지되지만 탭 간 토큰 공유 방지
// 401 응답 시 자동으로 로그아웃 처리

export const getToken = () => sessionStorage.getItem('token');

// JWT payload에서 만료 시간 추출 (클라이언트 사전 검사용)
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // 파싱 실패 → 만료로 간주
  }
};

const clearSession = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('empno');
};

export const authFetch = async (url, options = {}) => {
  const token = getToken();

  // 요청 전에 토큰 만료 여부 사전 확인
  if (token && isTokenExpired(token)) {
    clearSession();
    window.location.reload();
    return new Response(null, { status: 401 });
  }

  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 토큰 만료 / 미인증 → 자동 로그아웃 (401)
  if (response.status === 401) {
    clearSession();
    window.location.reload();
  }

  return response;
};
