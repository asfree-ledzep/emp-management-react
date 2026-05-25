// 인증 토큰을 포함한 fetch 래퍼
// sessionStorage 사용: 같은 탭 내 새로고침은 유지되지만 탭 간 토큰 공유 방지
// 401 응답 시 CustomEvent('auth:logout') 발송 → App.js에서 React 상태로 처리
// (window.location.reload() 제거 → 불필요한 전체 새로고침/로그아웃 루프 방지)

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

// 세션 정리 + CustomEvent 발송 (App.js가 catch → handleLogout 호출)
const triggerLogout = (reason = 'unknown') => {
  clearSession();
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));
};

export const authFetch = async (url, options = {}) => {
  const token = getToken();

  // 토큰 없음(미로그인) → 조용히 401 반환 (루프 방지)
  if (!token) {
    return new Response(null, { status: 401 });
  }

  // 클라이언트 측 만료 감지 → 로그아웃 이벤트 발송
  if (isTokenExpired(token)) {
    triggerLogout('token_expired');
    return new Response(null, { status: 401 });
  }

  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const response = await fetch(url, { ...options, headers });

  // 서버에서 401 → 로그아웃 이벤트 발송
  if (response.status === 401) {
    triggerLogout('server_401');
  }

  return response;
};
