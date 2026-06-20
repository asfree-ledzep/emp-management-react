import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyBalance, fetchMyLeaves, applyLeave, cancelLeave,
  fetchMgrPending, mgrApprove, mgrReject,
} from '../api/leaveApi';

const LEAVE_TYPES = ['연차', '반차(오전)', '반차(오후)', '외출', '병가', '특별휴가'];

const STATUS_CFG = {
  PENDING:      { text: '대기중',   color: '#d97706', bg: '#fef3c7', bar: '#fbbf24' },
  MGR_APPROVED: { text: '1차승인',  color: '#2563eb', bg: '#dbeafe', bar: '#60a5fa' },
  MGR_REJECTED: { text: '1차반려',  color: '#dc2626', bg: '#fee2e2', bar: '#f87171' },
  APPROVED:     { text: '최종승인', color: '#16a34a', bg: '#dcfce7', bar: '#34d399' },
  REJECTED:     { text: '최종반려', color: '#dc2626', bg: '#fee2e2', bar: '#f87171' },
};

const mgrStatusLabel = (status) => {
  if (status === 'PENDING')      return { text: '대기중',   color: '#f59e0b', bg: '#fef3c7' };
  if (['MGR_APPROVED','APPROVED','REJECTED'].includes(status))
                                 return { text: '승인완료', color: '#10b981', bg: '#d1fae5' };
  if (status === 'MGR_REJECTED') return { text: '반려',     color: '#ef4444', bg: '#fee2e2' };
  return { text: '-', color: '#6b7280', bg: '#f3f4f6' };
};

const fmtDate = (d) => {
  if (!d) return '-';
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
  return String(d).slice(0, 10);
};

const toDateStr = (d) => {
  if (!d) return '';
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
  return String(d).slice(0,10);
};

const calcWeekdays = (start, end) => {
  if (!start || !end) return 0;
  let count = 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  if (s > e) return 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_KO   = ['일','월','화','수','목','금','토'];

// ── 캘린더 컴포넌트 ────────────────────────────────────────────
function CalendarView({ leaves, balance, onApply }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());  // 0-based
  const [popup, setPopup] = useState(null); // { dateStr, items }

  const todayStr = now.toISOString().slice(0,10);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // 42칸 날짜 배열
  const firstDow = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, i - firstDow + 1);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {
      date: d, dateStr: ds,
      isCurrentMonth: d.getMonth() === month,
      isToday: ds === todayStr,
      dow: d.getDay(),
    };
  });

  // 승인된/대기 연차만 캘린더에 표시 (반려 제외)
  const activeLeavs = leaves.filter(lv => !['MGR_REJECTED','REJECTED'].includes(lv.status));

  const getLeavesForDate = (dateStr) =>
    activeLeavs.filter(lv => {
      const s = toDateStr(lv.startDate);
      const e = toDateStr(lv.endDate);
      return s && e && dateStr >= s && dateStr <= e;
    });

  const isStart = (lv, dateStr) => toDateStr(lv.startDate) === dateStr;
  const isEnd   = (lv, dateStr) => toDateStr(lv.endDate)   === dateStr;

  const handleCellClick = (dateStr, items) => {
    if (items.length > 0) setPopup({ dateStr, items });
  };

  // 이번 달 연차 요약
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthLeaves = activeLeavs.filter(lv => {
    const s = toDateStr(lv.startDate);
    const e = toDateStr(lv.endDate);
    return s?.startsWith(monthStr) || e?.startsWith(monthStr) ||
           (s < monthStr + '-01' && e > monthStr + '-31');
  });

  return (
    <div>
      {/* 월 네비게이션 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={prevMonth} style={navBtn}>◀</button>
          <span style={{ fontSize:'1.15rem', fontWeight:800, minWidth:120, textAlign:'center' }}>
            {year}년 {MONTH_KO[month]}
          </span>
          <button onClick={nextMonth} style={navBtn}>▶</button>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
            style={{ background:'#f3f4f6', border:'none', borderRadius:6, padding:'4px 10px', fontSize:'0.78rem', cursor:'pointer', color:'#6b7280', fontWeight:600 }}>
            오늘
          </button>
        </div>
        <button onClick={onApply}
          style={{ background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700, cursor:'pointer', fontSize:'0.88rem' }}>
          + 연차 신청
        </button>
      </div>

      {/* 이번 달 요약 */}
      {monthLeaves.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {monthLeaves.map(lv => {
            const cfg = STATUS_CFG[lv.status] || STATUS_CFG.PENDING;
            return (
              <div key={lv.leaveId} style={{
                background: cfg.bg, color: cfg.color,
                borderRadius: 20, padding:'3px 10px', fontSize:'0.75rem', fontWeight:600,
                border:`1px solid ${cfg.bar}`,
              }}>
                {lv.leaveType} {toDateStr(lv.startDate)?.slice(5)} ~ {toDateStr(lv.endDate)?.slice(5)} · {cfg.text}
              </div>
            );
          })}
        </div>
      )}

      {/* 캘린더 그리드 */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        {/* 요일 헤더 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'2px solid #e5e7eb' }}>
          {DAY_KO.map((d, i) => (
            <div key={d} style={{
              padding:'8px 0', textAlign:'center',
              fontSize:'0.78rem', fontWeight:700,
              color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#6b7280',
            }}>{d}</div>
          ))}
        </div>

        {/* 날짜 행들 */}
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom: row<5 ? '1px solid #f3f4f6' : 'none' }}>
            {cells.slice(row*7, row*7+7).map(cell => {
              const items = getLeavesForDate(cell.dateStr);
              const hasLeave = items.length > 0;

              return (
                <div key={cell.dateStr}
                  onClick={() => handleCellClick(cell.dateStr, items)}
                  style={{
                    minHeight: 72, padding:'6px 4px 4px',
                    borderRight: cell.dow < 6 ? '1px solid #f3f4f6' : 'none',
                    background: !cell.isCurrentMonth ? '#fafafa' : hasLeave ? 'rgba(79,70,229,0.02)' : '#fff',
                    cursor: hasLeave ? 'pointer' : 'default',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={e => { if (hasLeave) e.currentTarget.style.background='#f0f0ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = !cell.isCurrentMonth ? '#fafafa' : hasLeave ? 'rgba(79,70,229,0.02)' : '#fff'; }}
                >
                  {/* 날짜 숫자 */}
                  <div style={{ textAlign:'right', marginBottom:3 }}>
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      width:24, height:24, borderRadius:'50%', fontSize:'0.82rem', fontWeight:600,
                      background: cell.isToday ? '#4f46e5' : 'transparent',
                      color: cell.isToday ? '#fff'
                           : !cell.isCurrentMonth ? '#d1d5db'
                           : cell.dow === 0 ? '#ef4444'
                           : cell.dow === 6 ? '#3b82f6'
                           : '#111827',
                    }}>
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* 연차 바 */}
                  {items.map(lv => {
                    const cfg = STATUS_CFG[lv.status] || STATUS_CFG.PENDING;
                    const start = isStart(lv, cell.dateStr);
                    const end   = isEnd(lv, cell.dateStr);
                    const dow   = cell.dow;
                    // 행 첫날(일) 또는 연차시작일이면 좌측 라운드
                    const roundL = start || dow === 0;
                    // 행 마지막(토) 또는 연차종료일이면 우측 라운드
                    const roundR = end   || dow === 6;

                    return (
                      <div key={lv.leaveId} style={{
                        background: cfg.bar,
                        height: 18,
                        marginBottom: 2,
                        marginLeft: roundL ? 2 : 0,
                        marginRight: roundR ? 2 : 0,
                        borderRadius: `${roundL?9:0}px ${roundR?9:0}px ${roundR?9:0}px ${roundL?9:0}px`,
                        display:'flex', alignItems:'center',
                        paddingLeft: roundL ? 6 : 4,
                        overflow:'hidden',
                      }}>
                        {(start || dow === 0) && (
                          <span style={{ fontSize:'0.62rem', color:'#fff', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {lv.leaveType}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display:'flex', gap:14, marginTop:12, flexWrap:'wrap' }}>
        {Object.entries(STATUS_CFG).filter(([k]) => !['MGR_REJECTED','REJECTED'].includes(k)).map(([k, cfg]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:24, height:10, background:cfg.bar, borderRadius:5 }} />
            <span style={{ fontSize:'0.73rem', color:'#6b7280' }}>{cfg.text}</span>
          </div>
        ))}
      </div>

      {/* 날짜 클릭 팝업 */}
      {popup && (
        <div onClick={() => setPopup(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:12, padding:24, width:340, maxWidth:'90vw', boxShadow:'0 10px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:14, color:'#374151' }}>
              📅 {popup.dateStr.slice(5).replace('-','월 ')}일 연차 내역
            </div>
            {popup.items.map(lv => {
              const cfg = STATUS_CFG[lv.status] || STATUS_CFG.PENDING;
              return (
                <div key={lv.leaveId} style={{
                  background:cfg.bg, borderRadius:8, padding:'10px 14px', marginBottom:8,
                  border:`1px solid ${cfg.bar}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:'0.88rem', color:cfg.color }}>{lv.leaveType}</span>
                    <span style={{ fontSize:'0.73rem', fontWeight:600, color:cfg.color }}>{cfg.text}</span>
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'#374151' }}>
                    {toDateStr(lv.startDate)} ~ {toDateStr(lv.endDate)} ({lv.days}일)
                  </div>
                  {lv.reason && <div style={{ fontSize:'0.76rem', color:'#6b7280', marginTop:4 }}>사유: {lv.reason}</div>}
                </div>
              );
            })}
            <button onClick={() => setPopup(null)}
              style={{ width:'100%', marginTop:4, background:'#f3f4f6', border:'none', borderRadius:8, padding:'8px 0', cursor:'pointer', fontWeight:600, color:'#374151' }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  background:'#f3f4f6', border:'none', borderRadius:6, width:30, height:30,
  cursor:'pointer', fontSize:'0.8rem', color:'#374151', fontWeight:700,
  display:'flex', alignItems:'center', justifyContent:'center',
};

// ── 메인 페이지 ────────────────────────────────────────────────
// statusTab: 'pending' | 'approved' | 'rejected' | 'team'
export default function LeaveRequestPage({ mgrPendingCount = 0 }) {
  const [balance,  setBalance]  = useState(null);
  const [leaves,   setLeaves]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [statusTab, setStatusTab] = useState('pending'); // 승인요청건 | 승인완료건 | 반려건 | 팀원결재

  // 팀원 결재 탭 상태 (LeaveMgrPage 인라인)
  const [teamList,     setTeamList]     = useState([]);
  const [teamLoading,  setTeamLoading]  = useState(false);
  const [teamActionId, setTeamActionId] = useState(null);
  const [teamModal,    setTeamModal]    = useState(null); // { leaveId, approve }
  const [teamComment,  setTeamComment]  = useState('');

  const [form, setForm] = useState({
    leaveType: '연차', startDate: '', endDate: '', reason: '',
  });

  const autoEndDate = form.leaveType.includes('반차') || form.leaveType === '외출';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, list] = await Promise.all([fetchMyBalance(), fetchMyLeaves()]);
      setBalance(bal);
      setLeaves(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const calcDays = () => {
    if (form.leaveType === '외출') return 0.5;
    if (autoEndDate) return 0.5;
    return calcWeekdays(form.startDate, form.endDate);
  };

  const handleSave = async () => {
    if (!form.startDate) { setError('시작일을 선택해주세요.'); return; }
    if (!autoEndDate && !form.endDate) { setError('종료일을 선택해주세요.'); return; }
    if (!autoEndDate && form.endDate < form.startDate) {
      setError('종료일은 시작일 이후여야 합니다.'); return;
    }
    const days = calcDays();
    if (days <= 0) { setError('유효한 날짜 범위를 선택해주세요.'); return; }
    if (balance && days > balance.remaining) {
      setError(`잔여 연차가 부족합니다. (잔여: ${balance.remaining}일)`); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate:   autoEndDate ? form.startDate : form.endDate,
        days, reason: form.reason,
      };
      const res = await applyLeave(payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '신청 실패');
      }
      setShowForm(false);
      setForm({ leaveType: '연차', startDate: '', endDate: '', reason: '' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('신청을 취소하시겠습니까?')) return;
    const res = await cancelLeave(leaveId);
    if (res.ok) load(); else alert('취소 실패');
  };

  const inp = {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: '0.88rem', width: '100%', boxSizing: 'border-box',
  };

  // 팀원 결재 목록 로드
  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const data = await fetchMgrPending();
      setTeamList(Array.isArray(data) ? data : []);
    } catch { setTeamList([]); }
    finally { setTeamLoading(false); }
  }, []);

  // 팀원 결재 탭 진입 시 로드
  useEffect(() => { if (statusTab === 'team') loadTeam(); }, [statusTab, loadTeam]);

  const handleTeamDecide = async () => {
    const { leaveId, approve } = teamModal;
    setTeamActionId(leaveId);
    try {
      const res = approve ? await mgrApprove(leaveId, teamComment) : await mgrReject(leaveId, teamComment);
      if (!res.ok) throw new Error('처리 실패');
      setTeamModal(null); loadTeam();
    } catch (e) { alert(e.message); }
    finally { setTeamActionId(null); }
  };

  // 탭별 필터링
  const PENDING_ST  = ['PENDING', 'MGR_APPROVED'];
  const APPROVED_ST = ['APPROVED'];
  const REJECTED_ST = ['MGR_REJECTED', 'REJECTED'];

  const displayLeaves =
    statusTab === 'pending'  ? leaves.filter(lv => PENDING_ST.includes(lv.status))
    : statusTab === 'approved' ? leaves.filter(lv => APPROVED_ST.includes(lv.status))
    : statusTab === 'rejected' ? leaves.filter(lv => REJECTED_ST.includes(lv.status))
    : leaves;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 4px' }}>

      {/* ── 잔여 연차 카드 ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        color: '#fff', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 4 }}>
            {new Date().getFullYear()}년 연차 현황
          </div>
          {balance ? (
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              잔여 <span style={{ fontSize: '2rem' }}>{balance.remaining}</span>일
              <span style={{ fontSize: '0.9rem', opacity: 0.8, marginLeft: 10 }}>
                / 총 {balance.totalDays}일 · 사용 {balance.usedDays}일
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '1rem', opacity: 0.7 }}>불러오는 중...</div>
          )}
        </div>
        {/* 사용 비율 바 */}
        {balance && (
          <div style={{ minWidth: 140 }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>사용률</div>
            <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:6, height:8, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:6,
                background: balance.remaining > 5 ? '#a5b4fc' : '#f87171',
                width: `${Math.min(100,(balance.usedDays/(balance.totalDays||15))*100)}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize:'0.72rem', opacity:0.75, marginTop:3 }}>
              {((balance.usedDays/(balance.totalDays||15))*100).toFixed(0)}% 사용
            </div>
          </div>
        )}
      </div>

      {/* ── 상태 탭 네비게이션 ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:2, borderBottom:'2px solid #e5e7eb' }}>
          {[
            { key:'pending',  label:'승인요청건', color:'#d97706', count: leaves.filter(l=>PENDING_ST.includes(l.status)).length },
            { key:'approved', label:'승인완료건', color:'#16a34a', count: leaves.filter(l=>APPROVED_ST.includes(l.status)).length },
            { key:'rejected', label:'반려건',    color:'#dc2626', count: leaves.filter(l=>REJECTED_ST.includes(l.status)).length },
            ...(mgrPendingCount > 0 ? [{ key:'team', label:'팀원 결재', color:'#2563eb', count: mgrPendingCount }] : []),
          ].map(({ key, label, color, count }) => (
            <button key={key} onClick={() => { setStatusTab(key); setViewMode('list'); }} style={{
              border:'none', background:'none', cursor:'pointer', padding:'8px 16px',
              fontWeight:600, fontSize:'0.88rem', position:'relative',
              color: statusTab===key ? color : '#6b7280',
              borderBottom: statusTab===key ? `2px solid ${color}` : '2px solid transparent',
              marginBottom: -2, display:'flex', alignItems:'center', gap:5,
            }}>
              {label}
              {count > 0 && (
                <span style={{
                  background: statusTab===key ? color : '#e5e7eb',
                  color: statusTab===key ? '#fff' : '#6b7280',
                  borderRadius: 9999, fontSize:'0.68rem', fontWeight:700,
                  padding:'1px 6px', minWidth:18,
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* 연차 신청 버튼 + 캘린더 토글 (팀원 결재 탭 제외) */}
        {statusTab !== 'team' && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', background:'#f3f4f6', borderRadius:7, padding:3, gap:2 }}>
              {[['list','목록'],['calendar','캘린더']].map(([mode,lbl]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  border:'none', borderRadius:5, padding:'4px 11px', cursor:'pointer',
                  fontWeight:600, fontSize:'0.8rem',
                  background: viewMode===mode ? '#fff' : 'transparent',
                  color:       viewMode===mode ? '#4f46e5' : '#6b7280',
                  boxShadow:   viewMode===mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>{lbl}</button>
              ))}
            </div>
            <button onClick={() => { setShowForm(true); setError(''); }}
              style={{ padding:'7px 16px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:'0.85rem' }}>
              + 신청
            </button>
          </div>
        )}
      </div>

      {/* ── 팀원 결재 탭 ── */}
      {statusTab === 'team' && (
        <>
          {teamLoading ? (
            <p style={{ textAlign:'center', padding:'30px 0', color:'#9ca3af' }}>불러오는 중...</p>
          ) : teamList.length === 0 ? (
            <div style={{ background:'#f9fafb', border:'1px dashed #d1d5db', borderRadius:12, padding:'40px 0', textAlign:'center', color:'#9ca3af' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>✅</div>
              <p style={{ margin:0 }}>결재 대기 중인 연차 신청이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {teamList.map(lv => {
                const cfg = STATUS_CFG[lv.status] || { text: lv.status, color: '#6b7280', bg: '#f3f4f6', bar: '#e5e7eb' };
                return (
                  <div key={lv.leaveId} style={{
                    background:'#fff', border:'1px solid #e5e7eb', borderRadius:12,
                    padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
                    borderLeft:`4px solid ${cfg.bar}`,
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#374151' }}>{lv.ename}</span>
                          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, background: cfg.bg, color: cfg.color }}>{cfg.text}</span>
                          <span style={{ fontWeight:600, fontSize:'0.88rem', color:'#4b5563' }}>{lv.leaveType}</span>
                          <span style={{ fontSize:'0.83rem', color:'#6b7280' }}>
                            {fmtDate(lv.startDate)}{fmtDate(lv.startDate)!==fmtDate(lv.endDate)?` ~ ${fmtDate(lv.endDate)}`:''} ({lv.days}일)
                          </span>
                        </div>
                        {lv.reason && <div style={{ fontSize:'0.82rem', color:'#6b7280', marginTop:2 }}>사유: {lv.reason}</div>}
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button
                          onClick={() => { setTeamModal({ leaveId:lv.leaveId, approve:false }); setTeamComment(''); }}
                          disabled={teamActionId === lv.leaveId}
                          style={{ padding:'5px 12px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.8rem' }}>
                          반려
                        </button>
                        <button
                          onClick={() => { setTeamModal({ leaveId:lv.leaveId, approve:true }); setTeamComment(''); }}
                          disabled={teamActionId === lv.leaveId}
                          style={{ padding:'5px 12px', background:'#dcfce7', color:'#16a34a', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.8rem' }}>
                          {teamActionId === lv.leaveId ? '처리 중...' : '승인'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 팀원 결재 모달 */}
          {teamModal && (
            <div onClick={() => setTeamModal(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background:'#fff', borderRadius:14, padding:28, width:'min(420px,92vw)' }}>
                <h3 style={{ margin:'0 0 16px', fontSize:'1rem' }}>
                  {teamModal.approve ? '✅ 승인하시겠습니까?' : '↩ 반려하시겠습니까?'}
                </h3>
                <label style={{ fontSize:'0.85rem', fontWeight:600, display:'block', marginBottom:6 }}>
                  의견 {teamModal.approve ? '(선택)' : '(반려 사유)'}
                </label>
                <textarea value={teamComment} onChange={e => setTeamComment(e.target.value)}
                  placeholder={teamModal.approve ? '승인 의견 (선택)' : '반려 사유를 입력해주세요'}
                  style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:'8px 10px', height:80, resize:'none', fontFamily:'inherit', fontSize:'0.88rem' }} />
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                  <button onClick={() => setTeamModal(null)}
                    style={{ padding:'7px 16px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600 }}>취소</button>
                  <button onClick={handleTeamDecide}
                    style={{ padding:'7px 16px', background: teamModal.approve ? '#16a34a' : '#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:700 }}>
                    {teamModal.approve ? '승인 확정' : '반려 확정'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 캘린더 뷰 ── */}
      {statusTab !== 'team' && viewMode === 'calendar' && !loading && (
        <CalendarView
          leaves={leaves}
          balance={balance}
          onApply={() => { setShowForm(true); setError(''); }}
        />
      )}

      {/* ── 목록 뷰 ── */}
      {statusTab !== 'team' && viewMode === 'list' && (
        <>
          {loading ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>불러오는 중...</p>
          ) : displayLeaves.length === 0 ? (
            <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 12, padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📄</div>
              <p style={{ margin: 0 }}>
                {statusTab === 'pending' ? '승인 요청 중인 연차가 없습니다.' : statusTab === 'approved' ? '승인완료된 연차가 없습니다.' : '반려된 연차가 없습니다.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayLeaves.map(lv => {
                const cfg = STATUS_CFG[lv.status] || { text: lv.status, color: '#6b7280', bg: '#f3f4f6' };
                const mgr = mgrStatusLabel(lv.status);
                return (
                  <div key={lv.leaveId} style={{
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                    padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderLeft: `4px solid ${cfg.bar || '#e5e7eb'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.text}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{lv.leaveType}</span>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {fmtDate(lv.startDate)}{fmtDate(lv.startDate) !== fmtDate(lv.endDate) ? ` ~ ${fmtDate(lv.endDate)}` : ''}&nbsp;({lv.days}일)
                          </span>
                        </div>
                        {lv.mgrEmpno && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>팀장</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', background: '#f3f4f6', padding: '1px 8px', borderRadius: 10 }}>
                              {lv.mgrEmpno}{lv.mgrEname ? ` - ${lv.mgrEname}` : ''}
                            </span>
                            <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, background: mgr.bg, color: mgr.color }}>{mgr.text}</span>
                          </div>
                        )}
                        {lv.reason && <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>사유: {lv.reason}</div>}
                        {lv.mgrComment && <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: 4 }}>팀장 의견: {lv.mgrComment}</div>}
                        {lv.adminComment && <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 2 }}>관리자 의견: {lv.adminComment}</div>}
                      </div>
                      {lv.status === 'PENDING' && (
                        <button onClick={() => handleCancel(lv.leaveId)}
                          style={{ padding: '4px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 신청 모달 ── */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: 28, width: 'min(500px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>📝 연차 신청</h3>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>휴가 종류</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEAVE_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, leaveType: t }))}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                      border: `1px solid ${form.leaveType === t ? '#4f46e5' : '#d1d5db'}`,
                      background: form.leaveType === t ? '#4f46e5' : '#fff',
                      color: form.leaveType === t ? '#fff' : '#374151',
                      fontSize: '0.83rem', fontWeight: 600,
                    }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                  {autoEndDate ? '날짜' : '시작일'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: autoEndDate ? e.target.value : f.endDate }))}
                  style={inp} />
              </div>
              {!autoEndDate && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                    종료일 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="date" value={form.endDate} min={form.startDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    style={inp} />
                </div>
              )}
            </div>

            {form.startDate && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#166534' }}>
                📅 신청 일수: <strong>{calcDays()}일</strong>
                {balance && <span style={{ marginLeft: 10, color: '#374151' }}>(신청 후 잔여: {(balance.remaining - calcDays()).toFixed(1)}일)</span>}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                사유 <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.78rem' }}>(선택)</span>
              </label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="휴가 사유를 입력하세요." rows={3}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', background: saving ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                {saving ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
