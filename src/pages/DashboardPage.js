import React, { useEffect, useState } from 'react';
import { fetchEmps } from '../api/empApi';
import { fetchExpensesByMonth } from '../api/expenseApi';
import { fetchSurveys } from '../api/surveyApi';
import { fetchNotices } from '../api/noticeApi';

const fmt = (v) => v != null ? Number(v).toLocaleString('ko-KR') + ' 원' : '0 원';

const now   = new Date();
const YEAR  = now.getFullYear();
const MONTH = now.getMonth() + 1;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const todayStr = `${YEAR}년 ${MONTH}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`;

const DashboardPage = ({ username, onNavigate }) => {
  const [emps,        setEmps]        = useState([]);
  const [expenses,    setExpenses]    = useState([]);
  const [surveys,     setSurveys]     = useState([]);
  const [notices,     setNotices]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetchEmps().catch(() => []),
      fetchExpensesByMonth(YEAR, MONTH).catch(() => []),
      fetchSurveys().catch(() => []),
      fetchNotices().catch(() => []),
    ]).then(([e, ex, s, n]) => {
      setEmps(e);
      setExpenses(ex);
      setSurveys(s);
      setNotices(n);
      setLoading(false);
    });
  }, []);

  // 요약 계산
  const totalEmp        = emps.length;
  const totalExpense    = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingExpense  = expenses.filter(e => e.status !== 'CONFIRMED').length;
  const activeSurveys   = surveys.filter(s => s.status !== 'CLOSED').length;

  // 미확인 지출 최근 5건
  const pendingList = expenses
    .filter(e => e.status !== 'CONFIRMED')
    .slice(0, 5);

  // ── 스타일 ──
  const card = (bg, border) => ({
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: '20px 24px',
    flex: 1,
    minWidth: 160,
  });
  const cardNum  = { fontSize: '2rem', fontWeight: 700, marginBottom: 4 };
  const cardLabel = { fontSize: '0.82rem', color: '#6b7280' };

  const menuBtn = (color) => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '18px 16px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    textAlign: 'center',
    flex: 1,
    minWidth: 120,
    transition: 'opacity 0.15s',
  });

  const thStyle = {
    padding: '9px 12px',
    background: '#f3f4f6',
    fontSize: '0.8rem',
    color: '#374151',
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
  };
  const tdStyle = {
    padding: '9px 12px',
    fontSize: '0.83rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
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
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
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
      </div>

      {/* ── 바로가기 메뉴 ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#374151' }}>📌 바로가기</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={menuBtn('#4f46e5')} onClick={() => onNavigate('list')}>
            👥<br />직원 관리
          </button>
          <button style={menuBtn('#0891b2')} onClick={() => onNavigate('dept')}>
            🏢<br />부서 관리
          </button>
          <button style={menuBtn('#059669')} onClick={() => onNavigate('expense')}>
            💰<br />지출 관리
          </button>
          <button style={menuBtn('#d97706')} onClick={() => onNavigate('chart')}>
            📊<br />급여 통계
          </button>
          <button style={menuBtn('#7c3aed')} onClick={() => onNavigate('survey')}>
            📋<br />설문 관리
          </button>
          <button style={menuBtn('#6b7280')} onClick={() => onNavigate('notice')}>
            📢<br />공지사항
          </button>
        </div>
      </div>

      {/* ── 하단: 미확인 지출 + 최근 공지 ── */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* 미확인 지출 */}
        <div style={{ flex: 2, minWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>⏳ 미확인 지출</h3>
            <button
              onClick={() => onNavigate('expense')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          {pendingList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af',
              border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
              ✅ 미확인 지출이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  {['사원명', '날짜', '금액', '카테고리'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}
                </tr>
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
            <button
              onClick={() => onNavigate('notice')}
              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.83rem' }}>
              전체보기 →
            </button>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
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

      </div>
    </div>
  );
};

export default DashboardPage;
