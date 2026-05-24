import './App.css';
import './styles/dark.css';
import { useState, useEffect } from 'react';
import EmpListPage    from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';
import DeptListPage   from './pages/DeptListPage';
import MyProfilePage  from './pages/MyProfilePage';
import NoticePage     from './pages/NoticePage';
import LoginPage      from './pages/LoginPage';
import KakaoCallbackPage from './pages/KakaoCallbackPage';
import SurveyPage from './pages/SurveyPage';
import ExpensePage from './pages/ExpensePage';
import EmployeeExpensePage from './pages/EmployeeExpensePage';
import DashboardPage from './pages/DashboardPage';
import OrgChartPage from './pages/OrgChartPage';
import FaqManagePage from './pages/FaqManagePage';
import HolidayManagePage from './pages/HolidayManagePage';
import ChatbotButton from './components/ChatbotModal';
import { registerPush, unregisterPush } from './utils/pushNotification';

function App() {
  const [token,    setToken]    = useState(sessionStorage.getItem('token'));
  const [username, setUsername] = useState(sessionStorage.getItem('username'));
  const [role,     setRole]     = useState(sessionStorage.getItem('role'));
  const [empno,    setEmpno]    = useState(Number(sessionStorage.getItem('empno')) || null);

  // URL 쿼리 파라미터로 초기 페이지 결정 (?page=notice, ?page=survey)
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('page');
    return (p === 'notice' || p === 'survey') ? p : 'list';
  });

  // 다크 모드 상태 (localStorage 영구 저장)
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true'
  );

  // data-theme 속성을 html 루트에 적용
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme', darkMode ? 'dark' : 'light'
    );
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode(d => !d);

  // 로그인 성공 콜백
  const handleLogin = (data) => {
    sessionStorage.setItem('token',    data.token);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('role',     data.role);
    if (data.empno) sessionStorage.setItem('empno', String(data.empno));
    setToken(data.token);
    setUsername(data.username);
    setRole(data.role);
    setEmpno(data.empno ?? null);
    // 관리자 → 대시보드, 사원 → 목록
    setPage(data.role === 'ADMIN' ? 'dashboard' : 'list');
    // 로그인 시 푸시 알림 구독 등록 (관리자: empno=null, 사원: empno=사원번호)
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        registerPush(data.empno ?? null);
      }
    });
  };

  // 로그아웃
  const handleLogout = () => {
    if (role === 'ADMIN') {
      unregisterPush();
    }
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('empno');
    setToken(null);
    setUsername(null);
    setRole(null);
    setEmpno(null);
    setPage('list');
  };

  // 카카오 콜백 페이지
  if (window.location.pathname === '/kakao/callback') {
    return <KakaoCallbackPage />;
  }

  // 토큰 없으면 로그인 페이지 (챗봇은 로그인 없이도 사용 가능)
  if (!token) {
    return (
      <>
        {/* 로그인 화면 다크 모드 토글 */}
        <button className="dark-toggle-login" onClick={toggleDark}
          title={darkMode ? '라이트 모드' : '다크 모드'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <LoginPage onLogin={handleLogin} />
        <ChatbotButton darkMode={darkMode} />
      </>
    );
  }

  return (
    <div className="App">
      {/* 상단 바 */}
      <div className="app-topbar">
        <span className="app-topbar-user">
          {role === 'ADMIN' ? '🛡️' : '👤'} {username}
          <span className="app-topbar-role">
            {role === 'ADMIN' ? '관리자' : '사원'}
          </span>
        </span>

        {/* 다크 모드 토글 */}
        <button className="app-topbar-dark" onClick={toggleDark}
          title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        <button className="app-topbar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      {/* 일반 사원 */}
      {role === 'USER' && (
        <>
          {page === 'list'    && <MyProfilePage empno={empno} onNavigateToSurvey={() => setPage('survey')} onNavigateToExpense={() => setPage('expense')} onNavigateToNotice={() => setPage('notice')} />}
          {page === 'survey'  && <SurveyPage isAdmin={false} onNavigateToList={() => setPage('list')} />}
          {page === 'expense' && <EmployeeExpensePage onNavigateToList={() => setPage('list')} />}
          {page === 'notice'  && <NoticePage isAdmin={false} empno={empno} onNavigateToList={() => setPage('list')} />}
          <ChatbotButton darkMode={darkMode} />
        </>
      )}

      {/* 관리자 */}
      {role === 'ADMIN' && (
        <>
          {page === 'dashboard' && (
            <DashboardPage username={username} onNavigate={setPage} darkMode={darkMode} />
          )}
          {page === 'list' && (
            <EmpListPage
              onNavigateToChart={() => setPage('chart')}
              onNavigateToDept={() => setPage('dept')}
              onNavigateToNotice={() => setPage('notice')}
              onNavigateToSurvey={() => setPage('survey')}
              onNavigateToExpense={() => setPage('expense')}
              onNavigateToDashboard={() => setPage('dashboard')}
            />
          )}
          {page === 'chart' && (
            <SalaryChartPage onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'dept' && (
            <DeptListPage onNavigateToEmp={() => setPage('dashboard')} />
          )}
          {page === 'notice' && (
            <NoticePage isAdmin={true} empno={null} onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'survey' && (
            <SurveyPage isAdmin={true} onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'expense' && (
            <ExpensePage onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'expense-pending' && (
            <ExpensePage onNavigateToList={() => setPage('dashboard')} filterPending={true} />
          )}
          {page === 'orgchart' && (
            <OrgChartPage onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'faq' && (
            <FaqManagePage onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'holiday' && (
            <HolidayManagePage onNavigateToList={() => setPage('dashboard')} />
          )}
          <ChatbotButton darkMode={darkMode} />
        </>
      )}
    </div>
  );
}

export default App;
