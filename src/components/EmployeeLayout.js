import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import '../styles/EmployeeLayout.css';
import MyProfilePage from '../pages/MyProfilePage';
import NoticePage from '../pages/NoticePage';
import SurveyPage from '../pages/SurveyPage';
import EmployeeExpensePage from '../pages/EmployeeExpensePage';
import LeaveRequestPage from '../pages/LeaveRequestPage';
import SharedFolderPage from '../pages/SharedFolderPage';
import AttendancePage from '../pages/AttendancePage';
import BoardPage from '../pages/BoardPage';
import MessagePage from '../pages/MessagePage';
import WorkLogPage from '../pages/WorkLogPage';
import TodoPage from '../pages/TodoPage';
import { fetchMgrPending, fetchMyBalance } from '../api/leaveApi';
import { fetchMgrPendingLogs } from '../api/workLogApi';
import { authFetch } from '../api/apiClient';

// PM 수치 → 등급 계산 (DustWidget과 동일 로직)
const calcDustGrade = (type, value) => {
  const v = Number(value);
  if (isNaN(v) || v < 0) return 2;
  if (type === 'pm10') {
    if (v <= 30)  return 1;
    if (v <= 80)  return 2;
    if (v <= 150) return 3;
    return 4;
  }
  if (type === 'pm25') {
    if (v <= 15) return 1;
    if (v <= 35) return 2;
    if (v <= 75) return 3;
    return 4;
  }
  return 2;
};

// 등급 → 색상 (사이드바 다크 테마용)
const DUST_COLORS = {
  1: { text: '#93c5fd', badge: '#3b82f6', label: '좋음',   emoji: '😊' },
  2: { text: '#86efac', badge: '#22c55e', label: '보통',   emoji: '🙂' },
  3: { text: '#fdba74', badge: '#f97316', label: '나쁨',   emoji: '😷' },
  4: { text: '#fca5a5', badge: '#ef4444', label: '매우나쁨', emoji: '🚨' },
};

const MENU_KEYS = [
  { key: 'profile',    icon: '👤', tKey: 'menu_profile'    },
  { key: 'attendance', icon: '🕐', tKey: 'menu_attendance' },
  { key: 'worklog',    icon: '📋', tKey: 'menu_worklog'    },
  { key: 'todo',       icon: '☑️', tKey: 'menu_todo'       },
  { key: 'leave',      icon: '🏖️', tKey: 'menu_leave'      },
  { key: 'board',      icon: '📌', tKey: 'menu_board'      },
  { key: 'message',    icon: '✉️', tKey: 'menu_message'    },
  { key: 'folder',     icon: '📁', tKey: 'menu_folder'     },
  { key: 'notice',     icon: '📢', tKey: 'menu_notice'     },
  { key: 'survey',     icon: '📊', tKey: 'menu_survey'     },
  { key: 'expense',    icon: '💳', tKey: 'menu_expense'    },
];

export default function EmployeeLayout({ empno, darkMode, initialPage, role, username }) {
  const { t } = useLang();
  // 번역된 메뉴 배열 (언어 변경 시 자동 재계산)
  const MENU = MENU_KEYS.map(m => ({ ...m, label: t(m.tKey) }));

  const [page, setPage] = useState(initialPage || 'profile');
  const [mgrPendingCount, setMgrPendingCount] = useState(0);
  const [worklogPendingCount, setWorklogPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [dust, setDust] = useState(null);
  const [dustSido, setDustSido] = useState(() => localStorage.getItem('dustSido') || '서울');

  // 잔여 연차 조회
  useEffect(() => {
    fetchMyBalance()
      .then(setBalance)
      .catch(() => {});
  }, []);

  // 미읽음 쪽지 수 폴링
  useEffect(() => {
    const checkUnread = () => {
      authFetch('/api/msg/unread-count')
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setUnreadMsg(d.count || 0))
        .catch(() => {});
    };
    checkUnread();
    const t = setInterval(checkUnread, 30000);
    return () => clearInterval(t);
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

  // 업무일지 결재 대기 건수
  useEffect(() => {
    const check = () => {
      fetchMgrPendingLogs()
        .then(data => setWorklogPendingCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);

  // 미세먼지 조회 (30분 갱신)
  const [dustError, setDustError] = useState(null);
  useEffect(() => {
    const fetchDust = () => {
      authFetch(`/api/dust?sido=${encodeURIComponent(dustSido)}`)
        .then(r => r.json())
        .then(d => {
          if (d.error === 'API_FORBIDDEN') { setDustError('forbidden'); return; }
          if (!d.error) { setDust(d); setDustError(null); }
        })
        .catch(() => {});
    };
    fetchDust();
    const t = setInterval(fetchDust, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [dustSido]);

  const navigate = (key) => {
    setPage(key);
    setSidebarOpen(false); // 모바일에서 메뉴 선택 시 닫기
  };

  // 플로팅 쪽지 버튼에서 쪽지함으로 이동 요청
  useEffect(() => {
    const handler = (e) => {
      navigate('message');
      // msgId가 있으면 MessagePage에 전달 (MessagePage가 수신)
      if (e.detail?.msgId) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('msg:open', { detail: { msgId: e.detail.msgId } }));
        }, 100);
      }
    };
    window.addEventListener('nav:message', handler);
    return () => window.removeEventListener('nav:message', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMenu = MENU.find(m => m.key === page);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)', background: '#f3f4f6' }}>

      {/* ── 모바일 사이드바 오버레이 ── */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
      />

      {/* ── 사이드바 ── */}
      <aside
        style={{
          width: 220,
          background: '#1e1b4b',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
        }}
        className={`emp-sidebar${sidebarOpen ? ' open' : ''}`}
      >
        {/* 로고 영역 */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 4 }}>
            EMPLOYEE PORTAL
          </div>
          <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
            {t('sidebarTitle')}
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
            {new Date().getFullYear()}년 {t('remainLeave')}
          </div>
          {balance ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {balance.remaining}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 600 }}>{t('leaveDay')}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(196,181,253,0.8)', marginTop: 4 }}>
                {t('leaveUsed', { total: balance.totalDays, used: balance.usedDays })}
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

        {/* ── 미세먼지 미니 카드 ── */}
        <div style={{
          margin: '6px 14px 2px',
          background: 'rgba(30,27,75,0.6)',
          border: '1px solid rgba(165,180,252,0.2)',
          borderRadius: 10, padding: '10px 12px',
        }}>
          {/* 헤더 + 시도 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <div style={{ fontSize: '0.65rem', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.04em' }}>
              🌬️ {t('airQuality')}
            </div>
            <select
              value={dustSido}
              onChange={e => { setDustSido(e.target.value); localStorage.setItem('dustSido', e.target.value); }}
              style={{
                background: '#1e1b4b', border: '1px solid rgba(165,180,252,0.3)',
                color: '#c4b5fd', fontSize: '0.62rem', borderRadius: 4,
                padding: '1px 4px', cursor: 'pointer', outline: 'none',
              }}
            >
              {['서울','부산','대구','인천','광주','대전','울산','경기','강원',
                '충북','충남','전북','전남','경북','경남','제주','세종'].map(s => (
                <option key={s} value={s} style={{ background: '#1e1b4b', color: '#c4b5fd' }}>{s}</option>
              ))}
            </select>
          </div>

          {dustError === 'forbidden' ? (
            <div style={{ fontSize: '0.65rem', color: '#fdba74', textAlign: 'center', padding: '4px 0', lineHeight: 1.6 }}>
              🔑 API 키 등록 필요<br/>
              <span style={{ color: 'rgba(196,181,253,0.6)' }}>에어코리아 신청 후<br/>DUST_API_KEY 설정</span>
            </div>
          ) : dust ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {/* PM10 */}
              {[
                { key: 'pm10',  label: 'PM₁₀',   grade: calcDustGrade('pm10', dust.pm10),  val: dust.pm10  },
                { key: 'pm25',  label: 'PM₂.₅',  grade: calcDustGrade('pm25', dust.pm25),  val: dust.pm25  },
              ].map(item => {
                const c = DUST_COLORS[item.grade] || DUST_COLORS[2];
                return (
                  <div key={item.key} style={{
                    flex: 1, textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 6, padding: '5px 4px',
                  }}>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(196,181,253,0.7)', marginBottom: 2 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: c.text, lineHeight: 1 }}>
                      {item.val >= 0 ? item.val : '-'}
                    </div>
                    <div style={{
                      display: 'inline-block', marginTop: 3,
                      background: c.badge, color: '#fff',
                      fontSize: '0.58rem', fontWeight: 700,
                      borderRadius: 9999, padding: '1px 5px',
                    }}>
                      {c.emoji} {c.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'rgba(196,181,253,0.5)', textAlign: 'center', padding: '4px 0' }}>
              {t('loading')}
            </div>
          ) /* dust */}

          {/* 나쁨 이상 경고 */}
          {dust && (calcDustGrade('pm10', dust.pm10) >= 3 || calcDustGrade('pm25', dust.pm25) >= 3) && (
            <div style={{
              marginTop: 6, fontSize: '0.62rem', color: '#fdba74',
              background: 'rgba(249,115,22,0.15)', borderRadius: 5,
              padding: '3px 6px', textAlign: 'center', fontWeight: 600,
            }}>
              {t('maskWarn')}
            </div>
          )}
        </div>

        {/* 메뉴 항목 */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {MENU.map(item => {
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
                {item.key === 'leave' && mgrPendingCount > 0 && (
                  <span style={{
                    position: 'absolute', right: 14,
                    background: '#ef4444', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 700,
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{mgrPendingCount > 9 ? '9+' : mgrPendingCount}</span>
                )}
                {item.key === 'worklog' && worklogPendingCount > 0 && (
                  <span style={{
                    position: 'absolute', right: 14,
                    background: '#f97316', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 700,
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{worklogPendingCount > 9 ? '9+' : worklogPendingCount}</span>
                )}
                {item.key === 'message' && unreadMsg > 0 && (
                  <span style={{
                    position: 'absolute', right: 14,
                    background: '#ef4444', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 700,
                    borderRadius: '9999px', padding: '1px 5px', minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{unreadMsg > 99 ? '99+' : unreadMsg}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── 콘텐츠 영역 ── */}
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

        {/* 모바일 메뉴 헤더바 (모바일에서만 표시) */}
        <div className="mobile-menubar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-page-title">
            {currentMenu ? `${currentMenu.icon} ${currentMenu.label}` : '사원 포털'}
          </span>
        </div>

        {/* 페이지 콘텐츠 */}
        <div className="emp-main-content">
          {page === 'profile' && (
            <MyProfilePage
              empno={empno}
              onNavigateToSurvey={() => navigate('survey')}
              onNavigateToExpense={() => navigate('expense')}
              onNavigateToNotice={() => navigate('notice')}
              onNavigateToBoard={() => navigate('board')}
              onNavigateToTodo={() => navigate('todo')}
            />
          )}
          {page === 'worklog' && <WorkLogPage role={role} worklogPendingCount={worklogPendingCount} />}
          {page === 'todo'        && <TodoPage />}
          {page === 'leave' && <LeaveRequestPage mgrPendingCount={mgrPendingCount} />}
          {page === 'folder'         && <SharedFolderPage isAdmin={false} empno={empno} />}
          {page === 'attendance'     && <AttendancePage user={{ empno, role: role || 'USER', username }} />}
          {page === 'board'    && <BoardPage empno={empno} darkMode={darkMode} />}
          {page === 'message'  && <MessagePage empno={empno} darkMode={darkMode} />}
          {page === 'notice'   && <NoticePage isAdmin={false} empno={empno} onNavigateToList={() => navigate('profile')} />}
          {page === 'survey'  && <SurveyPage isAdmin={false} onNavigateToList={() => navigate('profile')} />}
          {page === 'expense' && <EmployeeExpensePage onNavigateToList={() => navigate('profile')} />}
        </div>
      </main>
    </div>
  );
}
