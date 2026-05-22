import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  fetchExpensesByMonth, confirmExpense, deleteExpense,
  fetchMonthlyStats, fetchYearlyStats,
  downloadDetailExcel, downloadMonthlyExcel, downloadYearlyExcel,
} from '../api/expenseApi';
import '../styles/ExpensePage.css';

const fmt = (v) => v != null ? Number(v).toLocaleString('ko-KR') + ' 원' : '-';

// 카테고리 도넛 차트 색상
const PIE_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const PieCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, percent } = payload[0].payload;
    return (
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 12px', fontSize:'0.82rem', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
        <p style={{ margin:'0 0 2px', fontWeight:700 }}>{name}</p>
        <p style={{ margin:'0 0 2px', color:'#4f46e5' }}>{Number(value).toLocaleString('ko-KR')} 원</p>
        <p style={{ margin:0, color:'#6b7280' }}>{(percent * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const now = new Date();
const THIS_YEAR  = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

// 2000년 ~ 올해+1 (지출내역·월별통계용)
const YEAR_OPTIONS = Array.from({ length: THIS_YEAR - 2000 + 2 }, (_, i) => 2000 + i);
// 2000년 ~ 올해 (연별통계용)
const YEAR_OPTIONS_Y = Array.from({ length: THIS_YEAR - 2000 + 1 }, (_, i) => 2000 + i);

const ExpensePage = ({ onNavigateToList }) => {
  const [tab, setTab] = useState('detail'); // 'detail' | 'monthly' | 'yearly'

  // ── 지출내역 탭 ──
  const [year,  setYear]  = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [expenses, setExpenses]   = useState([]);
  const [loading,  setLoading]    = useState(false);
  const [receiptModal, setReceiptModal] = useState(null); // 영수증 이미지 URL

  // ── 월별통계 탭 ──
  const [mYear,  setMYear]  = useState(THIS_YEAR);
  const [mMonth, setMMonth] = useState(THIS_MONTH);
  const [monthlyStats,  setMonthlyStats]  = useState([]);
  const [mLoading, setMLoading] = useState(false);

  // ── 연별통계 탭 ──
  const [yYear, setYYear] = useState(THIS_YEAR);
  const [yearlyStats,  setYearlyStats]  = useState([]);
  const [yLoading, setYLoading] = useState(false);

  // ─── 지출내역 로드 ───
  const loadExpenses = useCallback(() => {
    setLoading(true);
    fetchExpensesByMonth(year, month)
      .then(setExpenses)
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { if (tab === 'detail') loadExpenses(); }, [tab, loadExpenses]);

  // ─── 월별통계 로드 ───
  const loadMonthly = useCallback(() => {
    setMLoading(true);
    fetchMonthlyStats(mYear, mMonth)
      .then(setMonthlyStats)
      .catch(() => setMonthlyStats([]))
      .finally(() => setMLoading(false));
  }, [mYear, mMonth]);

  useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);

  // ─── 연별통계 로드 ───
  const loadYearly = useCallback(() => {
    setYLoading(true);
    fetchYearlyStats(yYear)
      .then(setYearlyStats)
      .catch(() => setYearlyStats([]))
      .finally(() => setYLoading(false));
  }, [yYear]);

  useEffect(() => { if (tab === 'yearly') loadYearly(); }, [tab, loadYearly]);

  // ─── 핸들러 ───
  const handleConfirm = async (id) => {
    if (!window.confirm('확인 처리하시겠습니까?')) return;
    const res = await confirmExpense(id);
    if (res.ok) loadExpenses(); else alert('처리 실패');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const res = await deleteExpense(id);
    if (res.ok) loadExpenses(); else alert('삭제 실패');
  };

  // 통계 생성 핸들러 제거됨 — 조회가 EXPENSE 테이블 실시간 집계로 변경됨

  // ─── 스타일 ───
  const tabBtn = (active) => ({
    padding: '9px 22px', border: 'none',
    borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    background: 'none', cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    color: active ? '#4f46e5' : '#6b7280', fontSize: '0.95rem',
  });
  const selectStyle = { padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:'0.9rem' };
  const btnPrimary  = { padding:'7px 16px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.85rem' };
  const btnGreen    = { padding:'7px 16px', background:'#059669', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.85rem' };
  const btnGray     = { padding:'7px 16px', background:'#6b7280', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.85rem' };
  const thStyle     = { padding:'10px 12px', background:'#f3f4f6', fontSize:'0.82rem', color:'#374151', fontWeight:600, textAlign:'left', borderBottom:'1px solid #e5e7eb' };
  const tdStyle     = { padding:'9px 12px', fontSize:'0.85rem', color:'#374151', borderBottom:'1px solid #f3f4f6', verticalAlign:'middle' };

  // ─── 합계 ───
  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  // ─── 카테고리별 집계 (도넛 차트용) ───
  const categoryData = (() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || '기타';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, percent: total > 0 ? value / total : 0 }));
  })();

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ margin:0 }}>💰 지출 관리</h2>
        <button onClick={onNavigateToList} style={btnGray}>🏠 대시보드</button>
      </div>

      {/* 탭 */}
      <div style={{ borderBottom:'1px solid #e5e7eb', marginBottom:24, display:'flex' }}>
        <button style={tabBtn(tab==='detail')}  onClick={() => setTab('detail')}>📄 지출 내역</button>
        <button style={tabBtn(tab==='monthly')} onClick={() => setTab('monthly')}>📅 월별 통계</button>
        <button style={tabBtn(tab==='yearly')}  onClick={() => setTab('yearly')}>📆 연별 통계</button>
      </div>

      {/* ════ 지출 내역 탭 ════ */}
      {tab === 'detail' && (
        <div>
          {/* 검색 바 */}
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <select value={year}  onChange={e => setYear(Number(e.target.value))}  style={selectStyle}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <button onClick={loadExpenses} style={btnPrimary}>조회</button>
            <button onClick={() => downloadDetailExcel(year, month).catch(()=>alert('다운로드 실패'))} style={btnGreen}>
              📥 엑셀 다운로드
            </button>
            {expenses.length > 0 && (
              <span style={{ marginLeft:'auto', fontWeight:700, color:'#4f46e5' }}>
                총 {expenses.length}건 / {fmt(totalAmount)}
              </span>
            )}
          </div>

          {/* 본문 */}
          {loading ? (
            <p style={{ color:'#6b7280', textAlign:'center' }}>불러오는 중...</p>
          ) : expenses.length === 0 ? (
            <p style={{ color:'#9ca3af', textAlign:'center' }}>지출 내역이 없습니다.</p>
          ) : (
            <div className="expense-content-layout">
              {/* 카테고리 도넛 차트 */}
              <div className="expense-donut-card">
                <h4 style={{ margin:'0 0 12px', fontSize:'0.92rem', color:'#374151', fontWeight:700 }}>
                  📊 카테고리별 지출
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip content={<PieCustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* 범례 */}
                <div style={{ marginTop:8 }}>
                  {categoryData.map((item, idx) => (
                    <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #f3f4f6', fontSize:'0.8rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:10, height:10, borderRadius:'50%', background: PIE_COLORS[idx % PIE_COLORS.length], display:'inline-block', flexShrink:0 }} />
                        <span style={{ color:'#374151' }}>{item.name}</span>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ color:'#6b7280' }}>{(item.percent * 100).toFixed(1)}%</span>
                        <span style={{ color:'#1f2937', fontWeight:600, marginLeft:8 }}>
                          {Number(item.value).toLocaleString('ko-KR')}원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, paddingTop:8, borderTop:'2px solid #e5e7eb', display:'flex', justifyContent:'space-between', fontSize:'0.82rem', fontWeight:700 }}>
                  <span style={{ color:'#374151' }}>합계</span>
                  <span style={{ color:'#4f46e5' }}>{totalAmount.toLocaleString('ko-KR')}원</span>
                </div>
              </div>

              {/* 테이블 */}
              <div className="expense-table-wrap">
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>
                        {['사원명','날짜','금액','카테고리','설명','영수증','상태','관리'].map(h =>
                          <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(e => (
                        <tr key={e.expenseId} style={{ background: e.status==='CONFIRMED' ? '#f0fdf4' : '#fff' }}>
                          <td style={tdStyle}>{e.ename || '-'}</td>
                          <td style={tdStyle}>{e.expenseDate || '-'}</td>
                          <td style={{ ...tdStyle, fontWeight:600, color:'#1f2937' }}>{fmt(e.amount)}</td>
                          <td style={tdStyle}>{e.category || '-'}</td>
                          <td style={{ ...tdStyle, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {e.description || '-'}
                          </td>
                          <td style={tdStyle}>
                            {e.receiptUrl ? (
                              <img src={e.receiptUrl} alt="영수증"
                                onClick={() => setReceiptModal(e.receiptUrl)}
                                style={{ width:44, height:44, objectFit:'cover', borderRadius:4, cursor:'pointer', border:'1px solid #e5e7eb' }} />
                            ) : '-'}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize:'0.75rem', padding:'3px 8px', borderRadius:10,
                              background: e.status==='CONFIRMED' ? '#d1fae5' : '#fef3c7',
                              color:      e.status==='CONFIRMED' ? '#065f46' : '#92400e'
                            }}>
                              {e.status==='CONFIRMED' ? '✅ 확인완료' : '⏳ 미확인'}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, whiteSpace:'nowrap' }}>
                            {e.status !== 'CONFIRMED' && (
                              <button onClick={() => handleConfirm(e.expenseId)}
                                style={{ ...btnGreen, marginRight:4, padding:'4px 10px', fontSize:'0.78rem' }}>확인</button>
                            )}
                            <button onClick={() => handleDelete(e.expenseId)}
                              style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:4, padding:'4px 10px', cursor:'pointer', fontSize:'0.78rem' }}>삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ 월별 통계 탭 ════ */}
      {tab === 'monthly' && (
        <div>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <select value={mYear}  onChange={e => setMYear(Number(e.target.value))}  style={selectStyle}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={mMonth} onChange={e => setMMonth(Number(e.target.value))} style={selectStyle}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <button onClick={loadMonthly} style={btnPrimary}>조회</button>
            <button onClick={() => downloadMonthlyExcel(mYear, mMonth).catch(()=>alert('다운로드 실패'))} style={btnGreen}>
              📥 엑셀 다운로드
            </button>
          </div>

          {mLoading ? (
            <p style={{ color:'#6b7280', textAlign:'center' }}>불러오는 중...</p>
          ) : monthlyStats.length === 0 ? (
            <p style={{ color:'#9ca3af', textAlign:'center' }}>해당 기간에 지출 데이터가 없습니다.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['사번','사원명','총 지출금액','건수'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(s => (
                  <tr key={s.statId}>
                    <td style={tdStyle}>{s.empno}</td>
                    <td style={tdStyle}>{s.ename || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight:600, color:'#4f46e5' }}>{fmt(s.totalAmount)}</td>
                    <td style={tdStyle}>{s.expenseCount}건</td>
                  </tr>
                ))}
                <tr style={{ background:'#f9fafb', fontWeight:700 }}>
                  <td style={tdStyle} colSpan={2}>합계</td>
                  <td style={{ ...tdStyle, color:'#dc2626' }}>
                    {fmt(monthlyStats.reduce((s,r) => s+(r.totalAmount||0), 0))}
                  </td>
                  <td style={tdStyle}>{monthlyStats.reduce((s,r) => s+(r.expenseCount||0), 0)}건</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ════ 연별 통계 탭 ════ */}
      {tab === 'yearly' && (
        <div>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
            <select value={yYear} onChange={e => setYYear(Number(e.target.value))} style={selectStyle}>
              {YEAR_OPTIONS_Y.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <button onClick={loadYearly} style={btnPrimary}>조회</button>
            <button onClick={() => downloadYearlyExcel(yYear).catch(()=>alert('다운로드 실패'))} style={btnGreen}>
              📥 엑셀 다운로드
            </button>
          </div>

          {yLoading ? (
            <p style={{ color:'#6b7280', textAlign:'center' }}>불러오는 중...</p>
          ) : yearlyStats.length === 0 ? (
            <p style={{ color:'#9ca3af', textAlign:'center' }}>해당 연도에 지출 데이터가 없습니다.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['사번','사원명','연간 총 지출금액','건수'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {yearlyStats.map(s => (
                  <tr key={s.statId}>
                    <td style={tdStyle}>{s.empno}</td>
                    <td style={tdStyle}>{s.ename || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight:600, color:'#4f46e5' }}>{fmt(s.totalAmount)}</td>
                    <td style={tdStyle}>{s.expenseCount}건</td>
                  </tr>
                ))}
                <tr style={{ background:'#f9fafb', fontWeight:700 }}>
                  <td style={tdStyle} colSpan={2}>합계</td>
                  <td style={{ ...tdStyle, color:'#dc2626' }}>
                    {fmt(yearlyStats.reduce((s,r) => s+(r.totalAmount||0), 0))}
                  </td>
                  <td style={tdStyle}>{yearlyStats.reduce((s,r) => s+(r.expenseCount||0), 0)}건</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 영수증 이미지 모달 */}
      {receiptModal && (
        <div onClick={() => setReceiptModal(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000, cursor:'pointer' }}>
          <img src={receiptModal} alt="영수증"
            style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} />
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
