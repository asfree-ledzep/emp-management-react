import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchEmps } from '../api/empApi';
import { fetchExpensesByMonth, fetchMonthlyStats } from '../api/expenseApi';
import { fetchSurveys } from '../api/surveyApi';
import { fetchNotices, fetchKakaoConnectedCount } from '../api/noticeApi';
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

const DashboardPage = ({ username, onNavigate }) => {
  const [emps,        setEmps]        = useState([]);
  const [expenses,    setExpenses]    = useState([]);
  const [surveys,     setSurveys]     = useState([]);
  const [notices,     setNotices]     = useState([]);
  const [trendData,   setTrendData]   = useState([]);
  const [kakaoCount,  setKakaoCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const last6 = getLastMonths(6);

    Promise.all([
      fetchEmps().catch(() => []),
      fetchExpensesByMonth(YEAR, MONTH).catch(() => []),
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
    ]).then(([e, ex, s, n, trend, kakao]) => {
      setEmps(e);
      setExpenses(ex);
      setSurveys(s);
      setNotices(n);
      setTrendData(trend);
      setKakaoCount(kakao.count ?? 0);
      setLoading(false);
    });
  }, []);

  // 요약 계산
  const totalEmp       = emps.length;
  const totalExpense   = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingExpense = expenses.filter(e => e.status !== 'CONFIRMED').length;
  const activeSurveys  = surveys.filter(s => s.status !== 'CLOSED').length;

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

  // ── 스타일 ──
  const card = (bg, border) => ({
    background: bg, border: `1px solid ${border}`,
    borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160,
  });
  const cardNum   = { fontSize: '2rem', fontWeight: 700, marginBottom: 4 };
  const cardLabel = { fontSize: '0.82rem', color: '#6b7280' };

  const menuBtn = (color) => ({
    background: color, color: '#fff', border: 'none', borderRadius: 12,
    padding: '18px 16px', cursor: 'pointer', fontSize: '0.9rem',
    fontWeight: 600, textAlign: 'center', flex: 1, minWidth: 120,
    transition: 'opacity 0.15s',
  });

  const thStyle = {
    padding: '9px 12px', background: '#f3f4f6', fontSize: '0.8rem',
    color: '#374151', fontWeight: 600, textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
  };
  const tdStyle = {
    padding: '9px 12px', fontSize: '0.83rem', color: '#374151',
    borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle',
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        대시보드 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          👋 안녕하세요, <span style={{ color: '#4f46e5' }}>{username}</span> 관리자님
        </h2>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{todayStr}</p>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="db-cards" style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={card('#eff6ff', '#bfdbfe')}>
          <div style={{ ...cardNum, color: '#1d4ed8' }}>{totalEmp}<span style={{ fontSize: '1rem' }}>명</span></div>
          <div style={cardLabel}>👥 전체 직원</div>
        </div>
        <div style={card('#f0fdf4', '#bbf7d0')}>
          <div style={{ ...cardNum, color: '#15803d', fontSize: '1.5rem' }}>{fmt(totalExpense)}</div>
          <div style={cardLabel}>💰 이번 달 지출 총액</div>
        </div>
        <div style={card(pendingExpense > 0 ? '#fef3c7' : '#f9fafb', pendingExpense > 0 ? '#fcd34d' : '#e5e7eb')}>
          <div style={{ ...cardNum, color: pendingExpense > 0 ? '#b45309' : '#374151' }}>
            {pendingExpense}<span style={{ fontSize: '1rem' }}>건</span>
          </div>
          <div style={cardLabel}>⏳ 미확인 지출</div>
        </div>
        <div style={card(activeSurveys > 0 ? '#fdf4ff' : '#f9fafb', activeSurveys > 0 ? '#e9d5ff' : '#e5e7eb')}>
          <div style={{ ...cardNum, color: activeSurveys > 0 ? '#7c3aed' : '#374151' }}>
            {activeSurveys}<span style={{ fontSize: '1rem' }}>개</span>
          </div>
          <div style={cardLabel}>📋 진행중 설문</div>
        </div>
        <div style={card(kakaoCount > 0 ? '#fff7ed' : '#f9fafb', kakaoCount > 0 ? '#fed7aa' : '#e5e7eb')}>
          <div style={{ ...cardNum, color: kakaoCount > 0 ? '#c2410c' : '#374151' }}>
            {kakaoCount}<span style={{ fontSize: '1rem' }}>명</span>
          </div>
          <div style={cardLabel}>💬 카카오 연동</div>
        </div>
      </div>

      {/* ── 바로가기 메뉴 ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#374151' }}>📌 바로가기</h3>
        <div className="db-menu" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={menuBtn('#4f46e5')} onClick={() => onNavigate('list')}>👥<br />직원 관리</button>
          <button style={menuBtn('#0891b2')} onClick={() => onNavigate('dept')}>🏢<br />부서 관리</button>
          <button style={menuBtn('#059669')} onClick={() => onNavigate('expense')}>💰<br />지출 관리</button>
          <button style={menuBtn('#d97706')} onClick={() => onNavigate('chart')}>📊<br />급여 통계</button>
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('survey')}>📋<br />설문 관리</button>
          <button style={menuBtn('#6b7280')} onClick={() => onNavigate('notice')}>📢<br />공지사항</button>
          <button style={menuBtn('#0f766e')} onClick={() => onNavigate('orgchart')}>🏢<br />조직도</button>
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('faq')}>💬<br />FAQ 관리</button>
          <button style={menuBtn('#dc2626')} onClick={() => onNavigate('holiday')}>📅<br />공휴일 관리</button>
        </div>
      </div>

      {/* ── 도넛 차트 2개 ── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>

        {/* 왼쪽: 월별 도넛 */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>🗓 월별 지출 (최근 6개월)</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              지출 관리 →
            </button>
          </div>
          {monthDonutData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '0.9rem' }}>
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
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                    {fmtShort(totalMonth6)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 2 }}>6개월 합계</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 10, justifyContent: 'center' }}>
                {monthDonutData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#374151' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span>{d.name} {fmtShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 오른쪽: 카테고리별 도넛 */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>🏷 카테고리별 지출 (이번 달)</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              지출 관리 →
            </button>
          </div>
          {categoryData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '0.9rem' }}>
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
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937' }}>
                    {fmtShort(totalExpense)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 2 }}>이번 달 합계</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 10, justifyContent: 'center' }}>
                {categoryData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#374151' }}>
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
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>⏳ 미확인 지출</h3>
            <button onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          {pendingList.length === 0 ? (
            <div style={{
              padding: '24px', textAlign: 'center', color: '#9ca3af',
              border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb',
              minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              ✅ 미확인 지출이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>{['사원명', '날짜', '금액', '카테고리'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pendingList.map(e => (
                  <tr key={e.expenseId} style={{ background: '#fff' }}>
                    <td style={tdStyle}>{e.ename || '-'}</td>
                    <td style={tdStyle}>{e.expenseDate || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1f2937' }}>{fmt(e.amount)}</td>
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
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>📢 최근 공지</h3>
            <button onClick={() => onNavigate('notice')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff', minHeight: 120 }}>
            {notices.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>공지사항이 없습니다</div>
            ) : (
              notices.slice(0, 5).map((n, i) => (
                <div key={n.id ?? i} style={{
                  padding: '12px 16px',
                  borderBottom: i < Math.min(notices.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 3 }}>
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
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>📋 진행중 설문</h3>
            <button onClick={() => onNavigate('survey')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff', minHeight: 120 }}>
            {activeSurveyList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>진행중인 설문이 없습니다</div>
            ) : (
              activeSurveyList.map((s, i) => (
                <div key={s.surveyId ?? i} style={{
                  padding: '12px 16px',
                  borderBottom: i < activeSurveyList.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 3, display: 'flex', gap: 8 }}>
                    <span>응답 {s.responseCount ?? 0}명</span>
                    {s.endDate && <span>· 마감 {s.endDate}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
