import './App.css';
import './styles/dark.css';
import { useState, useEffect } from 'react';
import EmpListPage    from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';
import DeptListPage   from './pages/DeptListPage';
import NoticePage     from './pages/NoticePage';
import LoginPage      from './pages/LoginPage';
import KakaoCallbackPage from './pages/KakaoCallbackPage';
import SurveyPage from './pages/SurveyPage';
import ExpensePage from './pages/ExpensePage';
import DashboardPage from './pages/DashboardPage';
import OrgChartPage from './pages/OrgChartPage';
import FaqManagePage from './pages/FaqManagePage';
import HolidayManagePage from './pages/HolidayManagePage';
import LeaveAdminPage from './pages/LeaveAdminPage';
import SharedFolderPage from './pages/SharedFolderPage';
import QrDisplayPage from './pages/QrDisplayPage';
import QrScanPage from './pages/QrScanPage';
import AttendancePage from './pages/AttendancePage';
import ChatbotButton from './components/ChatbotModal';
import EmployeeLayout from './components/EmployeeLayout';
import BoardAdminPage from './pages/BoardAdminPage';
import AdminProfileModal from './components/AdminProfileModal';
import { registerPush, unregisterPush } from './utils/pushNotification';

function App() {
  const [token,    setToken]    = useState(sessionStorage.getItem('token'));
  const [username, setUsername] = useState(sessionStorage.getItem('username'));
  const [role,     setRole]     = useState(sessionStorage.getItem('role'));
  const [empno,    setEmpno]    = useState(Number(sessionStorage.getItem('empno')) || null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // URL 쿼리 파라미터로 초기 페이지 결정 (?page=notice, ?page=survey, ?qr=TOKEN)
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('page');
    if (params.get('qr')) return 'qr-scan';  // QR 스캔 URL 감지
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
    if (data.empno)    sessionStorage.setItem('empno',    String(data.empno));
    if (data.deptno)   sessionStorage.setItem('deptno',   String(data.deptno));
    if (data.deptname) sessionStorage.setItem('deptname', data.deptname);
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
    sessionStorage.removeItem('deptno');
    sessionStorage.removeItem('deptname');
    setToken(null);
    setUsername(null);
    setRole(null);
    setEmpno(null);
    setPage('list');
  };

  // authFetch가 401/만료 감지 시 발송하는 CustomEvent 수신 → React 상태로 로그아웃
  // (window.location.reload() 대신 사용 → 1:1 채팅 등 클릭 시 강제 로그아웃 방지)
  useEffect(() => {
    const onAuthLogout = () => handleLogout();
    window.addEventListener('auth:logout', onAuthLogout);
    return () => window.removeEventListener('auth:logout', onAuthLogout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 카카오 콜백 페이지
  if (window.location.pathname === '/kakao/callback') {
    return <KakaoCallbackPage />;
  }

  // 토큰 없으면 로그인 페이지 (QR 스캔 URL이면 로그인 후 바로 처리)
  if (!token) {
    const qrToken = new URLSearchParams(window.location.search).get('qr');
    return (
      <>
        <button className="dark-toggle-login" onClick={toggleDark}
          title={darkMode ? '라이트 모드' : '다크 모드'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <LoginPage
          onLogin={(data) => {
            handleLogin(data);
            if (qrToken) setPage('qr-scan');
          }}
        />
        {qrToken && (
          <p style={{ textAlign: 'center', color: '#4f46e5', marginTop: 12 }}>
            ⚠️ 출퇴근 QR 처리를 위해 로그인이 필요합니다.
          </p>
        )}
        {/* 로그인 전엔 ChatbotButton 렌더링 안 함 → authFetch 401 무한 새로고침 방지 */}
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

        {/* 관리자 설정 버튼 (관리자만) */}
        {role === 'ADMIN' && (
          <button
            className="app-topbar-dark"
            onClick={() => setShowAdminModal(true)}
            title="관리자 설정"
            style={{ fontSize: '0.9rem' }}
          >
            ⚙️
          </button>
        )}

        {/* 다크 모드 토글 */}
        <button className="app-topbar-dark" onClick={toggleDark}
          title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        <button className="app-topbar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      {/* QR 스캔 처리 (로그인 후 ?qr= URL 접근) */}
      {page === 'qr-scan' && (
        <QrScanPage
          user={{ empno, role, username }}
          onHome={() => setPage(role === 'ADMIN' ? 'dashboard' : 'list')}
          onAttendance={() => setPage('attendance')}
        />
      )}

      {/* 일반 사원 → 왼쪽 사이드바 레이아웃 */}
      {role === 'USER' && page !== 'qr-scan' && (
        <>
          <EmployeeLayout empno={empno} darkMode={darkMode} role={role} username={username} />
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
          {page === 'leave' && (
            <LeaveAdminPage onNavigateToList={() => setPage('dashboard')} />
          )}
          {page === 'folder' && (
            <SharedFolderPage isAdmin={true} darkMode={darkMode} onDashboard={() => setPage('dashboard')} />
          )}
          {page === 'qr' && (
            <QrDisplayPage onDashboard={() => setPage('dashboard')} />
          )}
          {page === 'attendance' && (
            <AttendancePage user={{ empno, role, username }} onDashboard={() => setPage('dashboard')} />
          )}
          {page === 'board-admin' && (
            <BoardAdminPage darkMode={darkMode} onDashboard={() => setPage('dashboard')} />
          )}
          <ChatbotButton darkMode={darkMode} />
        </>
      )}

      {/* 관리자 설정 모달 (전역) */}
      {showAdminModal && (
        <AdminProfileModal
          darkMode={darkMode}
          onClose={() => setShowAdminModal(false)}
          onNameChange={(name) => setUsername(name)}
        />
      )}
    </div>
  );
}

export default App;
