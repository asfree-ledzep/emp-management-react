import React, { useState, useEffect } from 'react';
import '../styles/EmployeeLayout.css';
import MyProfilePage from '../pages/MyProfilePage';
import NoticePage from '../pages/NoticePage';
import SurveyPage from '../pages/SurveyPage';
import EmployeeExpensePage from '../pages/EmployeeExpensePage';
import LeaveRequestPage from '../pages/LeaveRequestPage';
import LeaveMgrPage from '../pages/LeaveMgrPage';
import { fetchMgrPending, fetchMyBalance } from '../api/leaveApi';

const MENU = [
  { key: 'profile',        icon: '👤', label: '내 프로필' },
  { key: 'leave',          icon: '🏖️', label: '연차 신청' },
  { key: 'leave-approved', icon: '📋', label: '결제완료 연차' },
  { key: 'mgr',            icon: '✅', label: '연차 승인', mgrOnly: true },
  { key: 'notice',         icon: '📢', label: '공지사항' },
  { key: 'survey',         icon: '📊', label: '설문' },
  { key: 'expense',        icon: '💳', label: '지출 신청' },
];

export default function EmployeeLayout({ empno, darkMode, initialPage }) {
  const [page, setPage] = useState(initialPage || 'profile');
  const [mgrPendingCount, setMgrPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(null);

  // 잔여 연차 조회
  useEffect(() => {
    fetchMyBalance()
      .then(setBalance)
      .catch(() => {});
  }, []);

  // MGR 승인 대기 건수 주기적으로 체크
  useEffect(() => {
    const check = () => {
      fetchMgrPending()
        .then(data => setMgrPendingCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);

  const navigate = (key) => {
    setPage(key);
    setSidebarOpen(false); // 모바일에서 메뉴 선택 시 닫기
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)', background: '#f3f4f6' }}>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 200, display: 'none',
          }}
          className="sidebar-overlay"
        />
      )}

      {/* 사이드바 */}
      <aside style={{
        width: 220,
        background: '#1e1b4b',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
      }} className={`emp-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* 로고 영역 */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 4 }}>
            EMPLOYEE PORTAL
          </div>
          <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
            사원 메뉴
          </div>
        </div>

        {/* 잔여 연차 카드 */}
        <div
          onClick={() => navigate('leave')}
          style={{
            margin: '14px 14px 4px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(124,58,237,0.55) 100%)',
            border: '1px solid rgba(165,180,252,0.3)',
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#c4b5fd', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>
            {new Date().getFullYear()}년 잔여 연차
          </div>
          {balance ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {balance.remaining}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 600 }}>일</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(196,181,253,0.8)', marginTop: 4 }}>
                총 {balance.totalDays}일 중 사용 {balance.usedDays}일
              </div>
              {/* 잔여 비율 바 */}
              <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.25)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: balance.remaining > 5 ? '#a5b4fc' : '#f87171',
                  width: `${Math.min(100, (balance.remaining / (balance.totalDays || 15)) * 100)}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'rgba(196,181,253,0.6)' }}>불러오는 중...</div>
          )}
        </div>

        {/* 메뉴 항목 */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {MENU.map(item => {
            if (item.mgrOnly && mgrPendingCount === 0 && page !== 'mgr') {
              // MGR 메뉴: 승인 대기가 없어도 항상 표시 (팀장인지 확인 어려우니 일단 표시)
            }
            const isActive = page === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isActive ? 'rgba(165,180,252,0.18)' : 'transparent',
                  color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem', fontWeight: isActive ? 700 : 400,
                  borderLeft: isActive ? '3px solid #a5b4fc' : '3px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.key === 'mgr' && mgrPendingCount > 0 && (
                  <span style={{
                    position: 'absolute', right: 14,
                    background: '#ef4444', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 700,
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{mgrPendingCount > 9 ? '9+' : mgrPendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="sidebar-toggle"
        style={{
          display: 'none',
          position: 'fixed', bottom: 20, right: 20, zIndex: 300,
          width: 48, height: 48, borderRadius: '50%',
          background: '#4f46e5', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: '1.3rem',
          boxShadow: '0 4px 12px rgba(79,70,229,0.5)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >☰</button>

      {/* 콘텐츠 영역 */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', minWidth: 0 }}>
        {page === 'profile' && (
          <MyProfilePage
            empno={empno}
            onNavigateToSurvey={() => navigate('survey')}
            onNavigateToExpense={() => navigate('expense')}
            onNavigateToNotice={() => navigate('notice')}
          />
        )}
        {page === 'leave'          && <LeaveRequestPage />}
        {page === 'leave-approved' && <LeaveRequestPage approvedOnly={true} />}
        {page === 'mgr'            && <LeaveMgrPage />}
        {page === 'notice'  && <NoticePage isAdmin={false} empno={empno} onNavigateToList={() => navigate('profile')} />}
        {page === 'survey'  && <SurveyPage isAdmin={false} onNavigateToList={() => navigate('profile')} />}
        {page === 'expense' && <EmployeeExpensePage onNavigateToList={() => navigate('profile')} />}
      </main>
    </div>
  );
}
