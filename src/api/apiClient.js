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

  // 토큰 없음(미로그인) → reload 없이 조용히 401 반환
  // (ChatbotButton이 마운트 상태에서 호출해도 새로고침 루프 방지)
  if (!token) {
    return new Response(null, { status: 401 });
  }

  // 토큰 만료 → 세션 정리 후 reload (로그인 상태였다가 만료된 경우)
  if (isTokenExpired(token)) {
    clearSession();
    window.location.reload();
    return new Response(null, { status: 401 });
  }

  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const response = await fetch(url, { ...options, headers });

  // 서버에서 401 → 세션 정리 후 reload (서버 측 토큰 거부)
  if (response.status === 401) {
    clearSession();
    window.location.reload();
  }

  return response;
};
