import './App.css';
import { useState } from 'react';
import EmpListPage    from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';
import DeptListPage   from './pages/DeptListPage';
import MyProfilePage  from './pages/MyProfilePage';
import LoginPage      from './pages/LoginPage';
import { registerPush, unregisterPush } from './utils/pushNotification';

function App() {
  const [token,    setToken]    = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [role,     setRole]     = useState(localStorage.getItem('role'));
  const [empno,    setEmpno]    = useState(Number(localStorage.getItem('empno')) || null);
  const [page,     setPage]     = useState('list');

  // 로그인 성공 콜백
  const handleLogin = (data) => {
    localStorage.setItem('token',    data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role',     data.role);
    if (data.empno) localStorage.setItem('empno', String(data.empno));
    setToken(data.token);
    setUsername(data.username);
    setRole(data.role);
    setEmpno(data.empno ?? null);
    // 관리자 로그인 시 푸시 알림 구독 등록
    if (data.role === 'ADMIN') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          registerPush();
        }
      });
    }
  };

  // 로그아웃
  const handleLogout = () => {
    // 관리자인 경우 푸시 구독 해제
    if (role === 'ADMIN') {
      unregisterPush();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('empno');
    setToken(null);
    setUsername(null);
    setRole(null);
    setEmpno(null);
    setPage('list');
  };

  // 토큰 없으면 로그인 페이지
  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
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
        <button className="app-topbar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      {/* 일반 사원: 본인 프로필만 */}
      {role === 'USER' && (
        <MyProfilePage empno={empno} />
      )}

      {/* 관리자: 기존 전체 화면 */}
      {role === 'ADMIN' && (
        <>
          {page === 'list' && (
            <EmpListPage
              onNavigateToChart={() => setPage('chart')}
              onNavigateToDept={() => setPage('dept')}
            />
          )}
          {page === 'chart' && (
            <SalaryChartPage onNavigateToList={() => setPage('list')} />
          )}
          {page === 'dept' && (
            <DeptListPage onNavigateToEmp={() => setPage('list')} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
