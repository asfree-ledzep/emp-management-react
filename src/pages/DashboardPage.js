import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchEmps } from '../api/empApi';
import { fetchExpensesByMonth, fetchMonthlyStats } from '../api/expenseApi';
import { fetchAllLeaves } from '../api/leaveApi';
import { fetchSurveys } from '../api/surveyApi';
import { fetchNotices, fetchKakaoConnectedCount, fetchKakaoStatus, sendKakaoTestMessage, sendKakaoNudge } from '../api/noticeApi';
import { sendPushNudgeKakao } from '../api/pushApi';
import { authFetch } from '../api/apiClient';
import '../styles/DashboardPage.css';

const fmt = (v) => v != null ? Number(v).toLocaleString('ko-KR') + ' 원' : '0 원';
const fmtShort = (v) => {
  if (!v) return '0원';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M원';
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K원';
  return Number(v).toLocaleString('ko-KR') + '원';
};

const MONTH_COLORS = ['#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#312e81'];
const CAT_COLORS   = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#6b7280'];
const CATEGORIES   = ['식비', '교통비', '숙박비', '업무용품', '접대비', '기타'];

const now   = new Date();
const YEAR  = now.getFullYear();
const MONTH = now.getMonth() + 1;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const todayStr = `${YEAR}년 ${MONTH}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`;

// 최근 N개월 { year, month } 배열 반환
const getLastMonths = (n) => {
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(YEAR, MONTH - 1 - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
};

// 도넛 차트 Tooltip
const DonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1e293b', color: '#f1f5f9', padding: '8px 12px',
        borderRadius: 8, fontSize: '0.82rem', lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700 }}>{payload[0].name}</div>
        <div>💰 {Number(payload[0].value).toLocaleString('ko-KR')} 원</div>
      </div>
    );
  }
  return null;
};

const DashboardPage = ({ username, onNavigate, darkMode = false }) => {
  const [emps,           setEmps]           = useState([]);
  const [expenses,       setExpenses]       = useState([]);
  const [allLeaves,      setAllLeaves]      = useState([]);
  const [surveys,        setSurveys]        = useState([]);
  const [notices,        setNotices]        = useState([]);
  const [trendData,      setTrendData]      = useState([]);
  const [kakaoCount,     setKakaoCount]     = useState(0);
  const [todayAttend,    setTodayAttend]    = useState([]);  // 당일 출근 현황
  const [loading,        setLoading]        = useState(true);

  // 카카오 연동 현황 모달
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const [kakaoStatus,    setKakaoStatus]    = useState(null);  // { connected:[], unconnected:[] }
  const [statusLoading,  setStatusLoading]  = useState(false);
  const [nudgeSending,      setNudgeSending]      = useState(false);
  const [nudgeResult,       setNudgeResult]       = useState(null);  // Web Push 결과
  const [kakaoNudgeSending, setKakaoNudgeSending] = useState(false);
  const [kakaoNudgeResult,  setKakaoNudgeResult]  = useState(null);  // 카카오 간접 독려 결과
  const [testingEmpno,   setTestingEmpno]   = useState(null);  // 테스트 발송 중인 empno
  const [testResults,    setTestResults]    = useState({});    // { empno: '성공'|'실패' }

  useEffect(() => {
    const last6 = getLastMonths(6);

    Promise.all([
      fetchEmps().catch(() => []),
      fetchExpensesByMonth(YEAR, MONTH).catch(() => []),
      fetchAllLeaves().catch(() => []),
      fetchSurveys().catch(() => []),
      fetchNotices().catch(() => []),
      // 최근 6개월 월별 통계 병렬 요청
      Promise.all(
        last6.map(({ year, month }) =>
          fetchMonthlyStats(year, month)
            .then((rows) => ({
              label: `${month}월`,
              total: rows.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
            }))
            .catch(() => ({ label: `${month}월`, total: 0 }))
        )
      ),
      fetchKakaoConnectedCount().catch(() => ({ count: 0 })),
      authFetch('/api/attendance/today').then(r => r.json()).catch(() => []),
    ]).then(([e, ex, lv, s, n, trend, kakao, todayArr]) => {
      setEmps(e);
      setExpenses(ex);
      setAllLeaves(Array.isArray(lv) ? lv : []);
      setSurveys(s);
      setNotices(n);
      setTrendData(trend);
      setKakaoCount(kakao.count ?? 0);
      setTodayAttend(Array.isArray(todayArr) ? todayArr : []);
      setLoading(false);
    });
  }, []);

  // 카카오 현황 모달 열기 (매번 최신 데이터 로드)
  const openKakaoModal = () => {
    setShowKakaoModal(true);
    setNudgeResult(null);
    setKakaoNudgeResult(null);
    setTestResults({});
    setKakaoStatus(null);
    setStatusLoading(true);
    fetchKakaoStatus()
      .then(data => setKakaoStatus(data))
      .catch(() => setKakaoStatus({ connected: [], unconnected: [] }))
      .finally(() => setStatusLoading(false));
  };

  // 특정 사원 카카오 테스트 메시지 발송
  const handleKakaoTest = async (empno, ename) => {
    setTestingEmpno(empno);
    try {
      await sendKakaoTestMessage(empno);
      setTestResults(prev => ({ ...prev, [empno]: '✅ 발송 성공' }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [empno]: '❌ 발송 실패' }));
    } finally {
      setTestingEmpno(null);
    }
  };

  // 카카오 간접 독려 (연동 직원들에게 카카오톡으로 발송)
  const handleKakaoNudge = async () => {
    setKakaoNudgeSending(true);
    setKakaoNudgeResult(null);
    try {
      const result = await sendKakaoNudge();
      setKakaoNudgeResult(result);
    } catch (e) {
      setKakaoNudgeResult({ message: '발송 실패', sentCount: 0 });
    } finally {
      setKakaoNudgeSending(false);
    }
  };

  // Web Push 독려 (미연동 직원에게 브라우저 알림)
  const handleNudge = async () => {
    setNudgeSending(true);
    setNudgeResult(null);
    try {
      const result = await sendPushNudgeKakao();
      setNudgeResult(result);
    } catch (e) {
      setNudgeResult({ message: '발송 실패', sentCount: 0 });
    } finally {
      setNudgeSending(false);
    }
  };

  // 요약 계산
  const totalEmp         = emps.length;
  const todayCheckedIn   = todayAttend.filter(a => a.checkIn).length;
  const todayLate        = todayAttend.filter(a => a.status === 'LATE').length;
  const todayAbsent      = totalEmp > 0 ? Math.max(0, totalEmp - todayCheckedIn) : 0;
  const totalExpense     = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingExpense   = expenses.filter(e => e.status !== 'CONFIRMED').length;
  const pendingLeaveCount = allLeaves.filter(l => l.status === 'PENDING' || l.status === 'MGR_APPROVED').length;
  const activeSurveys    = surveys.filter(s => s.status !== 'CLOSED').length;

  // 미확인 지출 최근 5건
  const pendingList = expenses.filter(e => e.status !== 'CONFIRMED').slice(0, 5);

  // 진행중 설문 최근 5건
  const activeSurveyList = surveys.filter(s => s.status !== 'CLOSED').slice(0, 5);

  // 월별 도넛 데이터 (0인 달 제외)
  const monthDonutData = trendData
    .map((d, i) => ({ name: d.label, value: d.total, color: MONTH_COLORS[i] }))
    .filter(d => d.value > 0);
  const totalMonth6 = trendData.reduce((s, d) => s + d.total, 0);

  // 카테고리별 도넛 데이터 (이번 달)
  const categoryData = CATEGORIES
    .map((cat, i) => ({
      name: cat,
      value: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
      color: CAT_COLORS[i],
    }))
    .filter(d => d.value > 0);

  // ── 다크 모드 색상 팔레트 ──
  const dk = darkMode;
  const C = {
    bg:        dk ? '#0f172a' : 'transparent',
    card:      dk ? '#1e293b' : '#ffffff',
    border:    dk ? '#334155' : '#e5e7eb',
    borderSub: dk ? '#1e293b' : '#f3f4f6',
    text:      dk ? '#e2e8f0' : '#374151',
    textMuted: dk ? '#94a3b8' : '#6b7280',
    textDark:  dk ? '#f1f5f9' : '#1f2937',
    thBg:      dk ? '#0f172a' : '#f3f4f6',
    thText:    dk ? '#94a3b8' : '#374151',
    emptyBg:   dk ? '#1e293b' : '#f9fafb',
    emptyText: dk ? '#64748b' : '#9ca3af',
  };

  // ── 스타일 헬퍼 ──
  const card = (lightBg, lightBorder) => ({
    background: dk ? C.card : lightBg,
    border: `1px solid ${dk ? C.border : lightBorder}`,
    borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160,
  });
  const cardNum   = { fontSize: '2rem', fontWeight: 700, marginBottom: 4 };
  const cardLabel = { fontSize: '0.82rem', color: C.textMuted };

  const menuBtn = (color) => ({
    background: color, color: '#fff', border: 'none', borderRadius: 12,
    padding: '18px 16px', cursor: 'pointer', fontSize: '0.9rem',
    fontWeight: 600, textAlign: 'center', flex: 1, minWidth: 120,
    transition: 'opacity 0.15s', opacity: dk ? 0.9 : 1,
  });

  const chartBox = {
    flex: 1, minWidth: 280,
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: '20px 24px',
  };

  const thStyle = {
    padding: '9px 12px', background: C.thBg, fontSize: '0.8rem',
    color: C.thText, fontWeight: 600, textAlign: 'left',
    borderBottom: `1px solid ${C.border}`,
  };
  const tdStyle = {
    padding: '9px 12px', fontSize: '0.83rem', color: C.text,
    borderBottom: `1px solid ${C.borderSub}`, verticalAlign: 'middle',
  };

  // 배지 표시 버튼 래퍼
  const BadgeBtn = ({ color, label, icon, count, onClick }) => (
    <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
      <button
        style={{ ...menuBtn(color), flex: 'unset', minWidth: 'unset', width: '100%' }}
        onClick={onClick}
      >
        {icon}<br />{label}
      </button>
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -7, right: -7,
          background: '#ef4444', color: '#fff',
          borderRadius: 999, minWidth: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 800, lineHeight: 1,
          padding: '0 5px', pointerEvents: 'none',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          border: '2px solid #fff',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
        대시보드 불러오는 중...
      </div>
    );
  }

  return (
    <div className="db-page-wrap" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', background: C.bg, minHeight: '100vh' }}>

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: C.textDark }}>
          👋 안녕하세요, <span style={{ color: '#4f46e5' }}>{username}</span> 관리자님
        </h2>
        <p style={{ margin: '6px 0 0', color: C.textMuted, fontSize: '0.9rem' }}>{todayStr}</p>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="db-cards" style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>

        {/* 당일 출근현황 → 출근 기록 */}
        <div
          className="db-card-link"
          style={{ ...card('#f0fdf4', '#bbf7d0'), cursor: 'pointer', minWidth: 180 }}
          onClick={() => onNavigate('attendance')}
          title="출근 기록으로 이동"
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d', lineHeight: 1 }}>
              {todayCheckedIn}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#15803d' }}>명</span>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>/ {totalEmp}명</span>
          </div>
          <div style={{ ...cardLabel, marginBottom: 8 }}>
            🕐 오늘 출근 현황 <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>▶ 상세</span>
          </div>
          {/* 출근률 바 */}
          <div style={{ background: '#d1fae5', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', borderRadius: 4, background: '#16a34a',
              width: totalEmp > 0 ? `${Math.round((todayCheckedIn / totalEmp) * 100)}%` : '0%',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem' }}>
            {todayLate > 0 && (
              <span style={{ color: '#d97706', fontWeight: 600 }}>⚠ 지각 {todayLate}명</span>
            )}
            {todayAbsent > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ 미출근 {todayAbsent}명</span>
            )}
            {todayAbsent === 0 && todayLate === 0 && todayCheckedIn > 0 && (
              <span style={{ color: '#15803d', fontWeight: 600 }}>✓ 전원 정상 출근</span>
            )}
          </div>
        </div>

        {/* 전체 직원 → 직원 관리 */}
        <div
          className="db-card-link"
          style={{ ...card('#eff6ff', '#bfdbfe'), cursor: 'pointer' }}
          onClick={() => onNavigate('list')}
          title="직원 관리로 이동"
        >
          <div style={{ ...cardNum, color: '#1d4ed8' }}>{totalEmp}<span style={{ fontSize: '1rem' }}>명</span></div>
          <div style={cardLabel}>👥 전체 직원 <span style={{ fontSize: '0.72rem', color: '#3b82f6' }}>▶ 관리</span></div>
        </div>

        {/* 이번 달 지출 → 지출 관리 */}
        <div
          className="db-card-link"
          style={{ ...card('#f0fdf4', '#bbf7d0'), cursor: 'pointer' }}
          onClick={() => onNavigate('expense')}
          title="지출 관리로 이동"
        >
          <div style={{ ...cardNum, color: '#15803d', fontSize: '1.5rem' }}>{fmt(totalExpense)}</div>
          <div style={cardLabel}>💰 이번 달 지출 총액 <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>▶ 관리</span></div>
        </div>

        {/* 미확인 지출 → 미확인 필터 지출 페이지 */}
        <div
          className="db-card-link"
          style={{ ...card(pendingExpense > 0 ? '#fef3c7' : '#f9fafb', pendingExpense > 0 ? '#fcd34d' : '#e5e7eb'), cursor: 'pointer' }}
          onClick={() => onNavigate('expense-pending')}
          title="미확인 지출 목록으로 이동"
        >
          <div style={{ ...cardNum, color: pendingExpense > 0 ? '#b45309' : '#374151' }}>
            {pendingExpense}<span style={{ fontSize: '1rem' }}>건</span>
          </div>
          <div style={cardLabel}>⏳ 미확인 지출 <span style={{ fontSize: '0.72rem', color: '#d97706' }}>▶ 목록</span></div>
        </div>

        {/* 진행중 설문 → 설문 관리 */}
        <div
          className="db-card-link"
          style={{ ...card(activeSurveys > 0 ? '#fdf4ff' : '#f9fafb', activeSurveys > 0 ? '#e9d5ff' : '#e5e7eb'), cursor: 'pointer' }}
          onClick={() => onNavigate('survey')}
          title="설문 관리로 이동"
        >
          <div style={{ ...cardNum, color: activeSurveys > 0 ? '#7c3aed' : '#374151' }}>
            {activeSurveys}<span style={{ fontSize: '1rem' }}>개</span>
          </div>
          <div style={cardLabel}>📋 진행중 설문 <span style={{ fontSize: '0.72rem', color: '#7c3aed' }}>▶ 관리</span></div>
        </div>

        {/* 카카오 연동 → 현황 모달 */}
        <div
          className="db-card-link"
          style={{ ...card(kakaoCount > 0 ? '#fff7ed' : '#f9fafb', kakaoCount > 0 ? '#fed7aa' : '#e5e7eb'), cursor: 'pointer' }}
          onClick={openKakaoModal}
          title="카카오 연동 현황 보기"
        >
          <div style={{ ...cardNum, color: kakaoCount > 0 ? '#c2410c' : '#374151' }}>
            {kakaoCount}<span style={{ fontSize: '1rem' }}>명</span>
          </div>
          <div style={cardLabel}>💬 카카오 연동 <span style={{ fontSize: '0.72rem', color: '#f97316' }}>▶ 현황</span></div>
        </div>

      </div>

      {/* ── 바로가기 메뉴 ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: C.text }}>📌 바로가기</h3>
        <div className="db-menu" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={menuBtn('#4f46e5')} onClick={() => onNavigate('list')}>👥<br />직원 관리</button>
          <button style={menuBtn('#0891b2')} onClick={() => onNavigate('dept')}>🏢<br />부서 관리</button>
          <BadgeBtn color="#059669" icon="💰" label="지출 관리" count={pendingExpense} onClick={() => onNavigate('expense')} />
          <button style={menuBtn('#d97706')} onClick={() => onNavigate('chart')}>📊<br />급여 통계</button>
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('survey')}>📋<br />설문 관리</button>
          <button style={menuBtn('#6b7280')} onClick={() => onNavigate('notice')}>📢<br />공지사항</button>
          <button style={menuBtn('#0f766e')} onClick={() => onNavigate('orgchart')}>🏢<br />조직도</button>
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('faq')}>💬<br />FAQ 관리</button>
          <button style={menuBtn('#dc2626')} onClick={() => onNavigate('holiday')}>📅<br />공휴일 관리</button>
          <BadgeBtn color="#0d9488" icon="🏖️" label="연차 관리" count={pendingLeaveCount} onClick={() => onNavigate('leave')} />
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('folder')}>📁<br />공유 폴더</button>
          <button style={menuBtn('#0f766e')} onClick={() => onNavigate('qr')}>📷<br />QR 출퇴근</button>
          <button style={menuBtn('#1d4ed8')} onClick={() => onNavigate('attendance')}>🕐<br />출근 기록</button>
          <button style={menuBtn('#be185d')} onClick={() => onNavigate('board-admin')}>📌<br />게시판 관리</button>
        </div>
      </div>

      {/* ── 도넛 차트 2개 ── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>

        {/* 왼쪽: 월별 도넛 */}
        <div style={{ ...chartBox }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>🗓 월별 지출 (최근 6개월)</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              지출 관리 →
            </button>
          </div>
          {monthDonutData.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.emptyText, padding: '60px 0', fontSize: '0.9rem' }}>
              📭 데이터가 없습니다
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={monthDonutData} cx="50%" cy="50%"
                      innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                      {monthDonutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.textDark }}>
                    {fmtShort(totalMonth6)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: C.textMuted, marginTop: 2 }}>6개월 합계</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 10, justifyContent: 'center' }}>
                {monthDonutData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.text }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span>{d.name} {fmtShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 오른쪽: 카테고리별 도넛 */}
        <div style={{ ...chartBox }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>🏷 카테고리별 지출 (이번 달)</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              지출 관리 →
            </button>
          </div>
          {categoryData.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.emptyText, padding: '60px 0', fontSize: '0.9rem' }}>
              📭 이번 달 지출이 없습니다
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%"
                      innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                      {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.textDark }}>
                    {fmtShort(totalExpense)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: C.textMuted, marginTop: 2 }}>이번 달 합계</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 10, justifyContent: 'center' }}>
                {categoryData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.text }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span>{d.name} {fmtShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── 하단: 미확인 지출 + 최근 공지 + 진행중 설문 ── */}
      <div className="db-bottom" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* 미확인 지출 */}
        <div style={{ flex: 2, minWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>⏳ 미확인 지출</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          {pendingList.length === 0 ? (
            <div style={{
              padding: '24px', textAlign: 'center', color: C.emptyText,
              border: `1px solid ${C.border}`, borderRadius: 10, background: C.emptyBg,
              minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              ✅ 미확인 지출이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>{['사원명', '날짜', '금액', '카테고리'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pendingList.map(e => (
                  <tr key={e.expenseId} style={{ background: C.card }}>
                    <td style={tdStyle}>{e.ename || '-'}</td>
                    <td style={tdStyle}>{e.expenseDate || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: C.textDark }}>{fmt(e.amount)}</td>
                    <td style={tdStyle}>{e.category || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 최근 공지사항 */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>📢 최근 공지</h3>
            <button onClick={() => onNavigate('notice')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.card, minHeight: 120 }}>
            {notices.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.emptyText }}>공지사항이 없습니다</div>
            ) : (
              notices.slice(0, 5).map((n, i) => (
                <div key={n.id ?? i} style={{
                  padding: '12px 16px',
                  borderBottom: i < Math.min(notices.length, 5) - 1 ? `1px solid ${C.borderSub}` : 'none',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textDark,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.emptyText, marginTop: 3 }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString('ko-KR') : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 진행중 설문 */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: C.text }}>📋 진행중 설문</h3>
            <button onClick={() => onNavigate('survey')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.card, minHeight: 120 }}>
            {activeSurveyList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.emptyText }}>진행중인 설문이 없습니다</div>
            ) : (
              activeSurveyList.map((s, i) => (
                <div key={s.surveyId ?? i} style={{
                  padding: '12px 16px',
                  borderBottom: i < activeSurveyList.length - 1 ? `1px solid ${C.borderSub}` : 'none',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textDark,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.emptyText, marginTop: 3, display: 'flex', gap: 8 }}>
                    <span>응답 {s.responseCount ?? 0}명</span>
                    {s.endDate && <span>· 마감 {s.endDate}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── 카카오 연동 현황 모달 ── */}
      {showKakaoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }} onClick={() => setShowKakaoModal(false)}>
          <div style={{
            background: C.card, borderRadius: 16, padding: '28px 32px',
            width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto',
            border: `1px solid ${C.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>

            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: C.textDark }}>💬 카카오 연동 현황</h3>
              <button onClick={() => setShowKakaoModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.textMuted }}>
                ✕
              </button>
            </div>

            {statusLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>불러오는 중...</div>
            ) : kakaoStatus ? (
              <>
                {/* 연동된 직원 */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 700, color: '#15803d',
                    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    ✅ 연동 완료 ({kakaoStatus.connected?.length ?? 0}명)
                  </div>
                  {(kakaoStatus.connected?.length ?? 0) === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: C.textMuted, padding: '8px 0' }}>연동된 직원이 없습니다.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {kakaoStatus.connected.map((emp, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                            borderRadius: 20, padding: '3px 14px', fontSize: '0.8rem', fontWeight: 600,
                            minWidth: 60, textAlign: 'center',
                          }}>{emp.ename}</span>
                          <button
                            onClick={() => handleKakaoTest(emp.empno, emp.ename)}
                            disabled={testingEmpno === emp.empno}
                            style={{
                              padding: '3px 10px', borderRadius: 8, border: '1px solid #6366f1',
                              background: testingEmpno === emp.empno ? '#e0e7ff' : '#fff',
                              color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600,
                              cursor: testingEmpno === emp.empno ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {testingEmpno === emp.empno ? '발송 중...' : '📨 카톡 테스트'}
                          </button>
                          {testResults[emp.empno] && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600,
                              color: testResults[emp.empno].startsWith('✅') ? '#15803d' : '#dc2626' }}>
                              {testResults[emp.empno]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, margin: '16px 0' }} />

                {/* 미연동 직원 */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 700, color: '#b45309',
                    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    ⚠️ 미연동 ({kakaoStatus.unconnected?.length ?? 0}명)
                  </div>
                  {(kakaoStatus.unconnected?.length ?? 0) === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: C.textMuted, padding: '8px 0' }}>모든 직원이 연동되었습니다 🎉</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {kakaoStatus.unconnected.map((emp, i) => (
                        <span key={i} style={{
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d',
                          borderRadius: 20, padding: '3px 12px', fontSize: '0.8rem', fontWeight: 600,
                        }}>{emp.ename}</span>
                      ))}
                    </div>
                  )}

                  {/* 독려 버튼 2종 */}
                  {(kakaoStatus.unconnected?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                      {/* ① 카카오 간접 독려 */}
                      <div>
                        <button
                          onClick={handleKakaoNudge}
                          disabled={kakaoNudgeSending || (kakaoStatus.connected?.length ?? 0) === 0}
                          style={{
                            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                            background: kakaoNudgeSending || (kakaoStatus.connected?.length ?? 0) === 0
                              ? '#e5e7eb' : '#fee500',
                            color: kakaoNudgeSending || (kakaoStatus.connected?.length ?? 0) === 0
                              ? '#9ca3af' : '#3c1e1e',
                            fontWeight: 700, fontSize: '0.88rem',
                            cursor: kakaoNudgeSending || (kakaoStatus.connected?.length ?? 0) === 0
                              ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          {kakaoNudgeSending ? '발송 중...' : '💬 연동 직원에게 카카오로 간접 독려'}
                        </button>
                        <div style={{ fontSize: '0.72rem', color: C.textMuted, marginTop: 4, textAlign: 'center' }}>
                          연동된 직원들 카카오톡으로 "미연동 동료 독려 부탁" 메시지 전송
                          {(kakaoStatus.connected?.length ?? 0) === 0 &&
                            <span style={{ color: '#dc2626' }}> (연동 직원 없음)</span>}
                        </div>
                        {kakaoNudgeResult && (
                          <div style={{
                            marginTop: 6, padding: '8px 12px', borderRadius: 8,
                            background: kakaoNudgeResult.sentCount > 0 ? '#dcfce7' : '#fef3c7',
                            color: kakaoNudgeResult.sentCount > 0 ? '#15803d' : '#92400e',
                            fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                          }}>
                            {kakaoNudgeResult.sentCount > 0
                              ? `✅ ${kakaoNudgeResult.sentCount}명에게 카카오 독려 메시지 발송 완료`
                              : '⚠️ 발송 실패 (연동 직원 없거나 토큰 오류)'}
                          </div>
                        )}
                      </div>

                      {/* ② Web Push 직접 독려 */}
                      <div>
                        <button
                          onClick={handleNudge}
                          disabled={nudgeSending}
                          style={{
                            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                            background: nudgeSending ? '#e5e7eb' : '#f97316',
                            color: nudgeSending ? '#9ca3af' : '#fff',
                            fontWeight: 700, fontSize: '0.88rem',
                            cursor: nudgeSending ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          {nudgeSending ? '발송 중...' : '📲 미연동 직원에게 브라우저 알림 직접 발송'}
                        </button>
                        <div style={{ fontSize: '0.72rem', color: C.textMuted, marginTop: 4, textAlign: 'center' }}>
                          앱 로그인 + 알림 허용한 미연동 직원에게만 전달됨
                        </div>
                        {nudgeResult && (
                          <div style={{
                            marginTop: 6, padding: '8px 12px', borderRadius: 8,
                            background: nudgeResult.sentCount > 0 ? '#dcfce7' : '#fef3c7',
                            color: nudgeResult.sentCount > 0 ? '#15803d' : '#92400e',
                            fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                          }}>
                            {nudgeResult.sentCount > 0
                              ? `✅ ${nudgeResult.sentCount}명에게 브라우저 알림 발송 완료`
                              : '⚠️ 알림 받을 수 있는 미연동 직원 없음 (앱 미로그인)'}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>데이터를 불러오지 못했습니다</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
