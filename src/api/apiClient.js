// 인증 토큰을 포함한 fetch 래퍼
// sessionStorage 사용: 같은 탭 내 새로고침 유지, 탭 간 토큰 공유 방지
// 401 응답 시 CustomEvent('auth:logout') → App.js가 React 상태로 처리

export const getToken = () => sessionStorage.getItem('token');

/**
 * JWT payload 만료 여부 확인 (클라이언트 사전 검사용)
 * ⚠️ JWT는 base64url 인코딩 사용 (-,_) → atob() 전에 표준 base64로 변환 필수
 */
const isTokenExpired = (token) => {
  try {
    // base64url → base64 변환 후 디코딩
    const base64url = token.split('.')[1];
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(base64));
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
export const triggerLogout = (reason = 'unknown') => {
  clearSession();
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));
};

/**
 * 인증 fetch 래퍼
 * @param {string} url
 * @param {object} options  fetch 옵션 + 커스텀 옵션:
 *   noAutoLogout {boolean} - true면 서버 401 시 자동 로그아웃 안 함 (호출부에서 직접 처리)
 */
export const authFetch = async (url, options = {}) => {
  const { noAutoLogout = false, ...fetchOptions } = options;

  const token = getToken();

  // 토큰 없음(미로그인) → 조용히 401 반환
  if (!token) {
    return new Response(null, { status: 401 });
  }

  // 클라이언트 측 만료 감지 → 무조건 로그아웃 (noAutoLogout 무시)
  if (isTokenExpired(token)) {
    triggerLogout('token_expired');
    return new Response(null, { status: 401 });
  }

  const headers = {
    ...(fetchOptions.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  // 서버 401 → noAutoLogout=false 이면 자동 로그아웃
  if (response.status === 401 && !noAutoLogout) {
    triggerLogout('server_401');
  }

  return response;
};
