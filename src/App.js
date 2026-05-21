import './App.css';
import { useState } from 'react';
import EmpListPage from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';
import DeptListPage from './pages/DeptListPage';
import LoginPage from './pages/LoginPage';

function App() {
  // localStorage에서 로그인 상태 복원
  const [token, setToken]       = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  // 현재 페이지 상태: 'list' | 'chart' | 'dept'
  const [page, setPage] = useState('list');

  // 로그인 성공 콜백
  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    setToken(data.token);
    setUsername(data.username);
  };

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setPage('list');
  };

  // 토큰 없으면 로그인 페이지
  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      {/* 상단 바: 사용자 정보 + 로그아웃 */}
      <div className="app-topbar">
        <span className="app-topbar-user">👤 {username}</span>
        <button className="app-topbar-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

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
    </div>
  );
}

export default App;
