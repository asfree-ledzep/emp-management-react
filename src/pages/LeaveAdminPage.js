import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { fetchAllLeaves, adminApprove, adminReject, fetchAllBalances } from '../api/leaveApi';

const STATUS_LABEL = {
  PENDING:      { text: '대기중',    color: '#f59e0b', bg: '#fef3c7' },
  MGR_APPROVED: { text: '1차승인',   color: '#3b82f6', bg: '#dbeafe' },
  MGR_REJECTED: { text: '1차반려',   color: '#ef4444', bg: '#fee2e2' },
  APPROVED:     { text: '최종승인',  color: '#10b981', bg: '#d1fae5' },
  REJECTED:     { text: '최종반려',  color: '#ef4444', bg: '#fee2e2' },
};

const fmtDate = (d) => {
  if (!d) return '-';
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
  return String(d).slice(0, 10);
};

const CURRENT_YEAR = new Date().getFullYear();

// 툴팁 커스텀
const BalanceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const used      = payload.find(p => p.dataKey === 'usedDays');
  const remaining = payload.find(p => p.dataKey === 'remaining');
  const total     = (used?.value || 0) + (remaining?.value || 0);
  return (
    <div style={{
      background: '#1e293b', color: '#f1f5f9', padding: '10px 14px',
      borderRadius: 8, fontSize: '0.82rem', lineHeight: 1.8,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>총 연차: <strong>{total}일</strong></div>
      <div style={{ color: '#f87171' }}>사용: <strong>{used?.value ?? 0}일</strong></div>
      <div style={{ color: '#6ee7b7' }}>잔여: <strong>{remaining?.value ?? 0}일</strong></div>
    </div>
  );
};

export default function LeaveAdminPage({ onNavigateToList }) {
  const [leaves,      setLeaves]      = useState([]);
  const [balances,    setBalances]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState('MGR_APPROVED');
  const [actionId,    setActionId]    = useState(null);
  const [commentModal,setCommentModal]= useState(null);
  const [comment,     setComment]     = useState('');
  const [chartYear,   setChartYear]   = useState(CURRENT_YEAR);
  const [deptFilter,  setDeptFilter]  = useState('__AUTO__'); // '__AUTO__'=최신신청부서, 'ALL'=전체

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllLeaves();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 차트용 잔여 연차 현황 로드
  const loadBalances = useCallback(async () => {
    try {
      const data = await fetchAllBalances(chartYear);
      setBalances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, [chartYear]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadBalances(); }, [loadBalances]);

  // 부서 목록 (중복 제거, 정렬)
  const deptList = [...new Map(
    balances.filter(b => b.deptno).map(b => [b.deptno, { deptno: b.deptno, dname: b.dname || `부서${b.deptno}` }])
  ).values()].sort((a, b) => a.deptno - b.deptno);

  // 최신 연차 신청 부서 (leaves[0]이 가장 최신)
  const latestDeptno = (() => {
    const latest = [...leaves].sort((a, b) => {
      const da = Array.isArray(a.createdAt) ? new Date(a.createdAt[0], a.createdAt[1]-1, a.createdAt[2]) : new Date(a.createdAt);
      const db = Array.isArray(b.createdAt) ? new Date(b.createdAt[0], b.createdAt[1]-1, b.createdAt[2]) : new Date(b.createdAt);
      return db - da;
    })[0];
    if (!latest) return null;
    const found = balances.find(b => b.empno === latest.empno);
    return found?.deptno ?? null;
  })();

  // 실제 표시할 부서 필터
  const activeDept = deptFilter === '__AUTO__'
    ? (latestDeptno ?? 'ALL')
    : deptFilter;

  // 차트 데이터 가공
  const allChartData = balances.map(b => ({
    name:      b.ename || `#${b.empno}`,
    deptno:    b.deptno,
    dname:     b.dname,
    usedDays:  b.usedDays  ?? 0,
    remaining: (b.totalDays ?? 15) - (b.usedDays ?? 0),
    total:     b.totalDays ?? 15,
  }));

  const chartData = activeDept === 'ALL'
    ? allChartData
    : allChartData.filter(d => d.deptno === activeDept);

  const filtered = filter === 'ALL'
    ? leaves
    : leaves.filter(l => l.status === filter);

  const counts = leaves.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const openDecide = (leaveId, approve) => {
    setCommentModal({ leaveId, approve });
    setComment('');
  };

  const handleDecide = async () => {
    const { leaveId, approve } = commentModal;
    setActionId(leaveId);
    try {
      const res = approve
        ? await adminApprove(leaveId, comment)
        : await adminReject(leaveId, comment);
      if (!res.ok) throw new Error('처리 실패');
      setCommentModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  const filterOptions = [
    { key: 'ALL',          label: '전체',    cnt: leaves.length },
    { key: 'PENDING',      label: '대기중',   cnt: counts.PENDING || 0 },
    { key: 'MGR_APPROVED', label: '1차승인',  cnt: counts.MGR_APPROVED || 0 },
    { key: 'MGR_REJECTED', label: '1차반려',  cnt: counts.MGR_REJECTED || 0 },
    { key: 'APPROVED',     label: '최종승인', cnt: counts.APPROVED || 0 },
    { key: 'REJECTED',     label: '최종반려', cnt: counts.REJECTED || 0 },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🏖️ 연차/휴가 관리</h2>
        <button
          onClick={onNavigateToList}
          style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >🏠 대시보드</button>
      </div>

      {/* ── 연차 현황 차트 ── */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
        padding: '20px 24px', marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* ① 차트 헤더 — 제목 + 연도 선택 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
            📊 사원별 연차 현황
            {activeDept !== 'ALL' && deptList.find(d => d.deptno === activeDept) && (
              <span style={{ marginLeft: 8, fontSize: '0.82rem', color: '#6366f1', fontWeight: 600 }}>
                — {deptList.find(d => d.deptno === activeDept).dname}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <button key={y} onClick={() => setChartYear(y)}
                style={{
                  padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  border: `1px solid ${chartYear === y ? '#4f46e5' : '#d1d5db'}`,
                  background: chartYear === y ? '#4f46e5' : '#fff',
                  color: chartYear === y ? '#fff' : '#374151',
                }}>{y}년</button>
            ))}
          </div>
        </div>

        {/* ② 부서 필터 탭 */}
        {deptList.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 최신 신청 부서 (기본) */}
            <button
              onClick={() => setDeptFilter('__AUTO__')}
              style={{
                padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                border: `1px solid ${deptFilter === '__AUTO__' ? '#f59e0b' : '#d1d5db'}`,
                background: deptFilter === '__AUTO__' ? '#fef3c7' : '#fff',
                color: deptFilter === '__AUTO__' ? '#92400e' : '#374151',
              }}>
              🔔 최신신청 부서
            </button>

            {/* 전체 직원 그래프 */}
            <button
              onClick={() => setDeptFilter('ALL')}
              style={{
                padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                border: `1px solid ${deptFilter === 'ALL' ? '#6366f1' : '#d1d5db'}`,
                background: deptFilter === 'ALL' ? '#4f46e5' : '#fff',
                color: deptFilter === 'ALL' ? '#fff' : '#374151',
              }}>
              👥 전체 직원 그래프 보기
            </button>

            {/* 구분선 */}
            <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>|</span>

            {/* 부서별 버튼 */}
            {deptList.map(dept => {
              const isActive = deptFilter === dept.deptno || (deptFilter === '__AUTO__' && activeDept === dept.deptno);
              return (
                <button
                  key={dept.deptno}
                  onClick={() => setDeptFilter(dept.deptno)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    border: `1px solid ${isActive ? '#10b981' : '#d1d5db'}`,
                    background: isActive ? '#d1fae5' : '#fff',
                    color: isActive ? '#065f46' : '#374151',
                    position: 'relative',
                  }}>
                  {dept.dname}
                  {deptFilter === '__AUTO__' && latestDeptno === dept.deptno && (
                    <span style={{
                      position: 'absolute', top: -5, right: -5,
                      background: '#ef4444', color: '#fff',
                      fontSize: '0.58rem', borderRadius: '50%', width: 14, height: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>N</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: '0.88rem' }}>
            연차 데이터가 없습니다. (연차 신청 후 잔여 현황이 생성됩니다)
          </div>
        ) : (
          <>
            {/* ③ 가로 스택 바 차트 */}
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 46)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 55, left: 20, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 'dataMax + 2']}
                  tickCount={6}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={v => `${v}일`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={76}
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                />
                <Tooltip content={<BalanceTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  formatter={v => v === 'usedDays' ? '사용' : '잔여'}
                  wrapperStyle={{ fontSize: '0.8rem' }}
                />
                <Bar dataKey="usedDays" name="usedDays" stackId="a" fill="#f87171" radius={[4,0,0,4]}>
                  <LabelList dataKey="usedDays" position="insideLeft"
                    style={{ fill: '#fff', fontSize: 11, fontWeight: 700 }}
                    formatter={v => v > 0 ? `${v}일` : ''}
                  />
                </Bar>
                <Bar dataKey="remaining" name="remaining" stackId="a" fill="#6ee7b7" radius={[0,4,4,0]}>
                  <LabelList dataKey="remaining" position="insideRight"
                    style={{ fill: '#065f46', fontSize: 11, fontWeight: 700 }}
                    formatter={v => v > 0 ? `${v}일` : ''}
                  />
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.remaining <= 3 ? '#fbbf24' : '#6ee7b7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* ④ 요약 카드 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { label: '대상 사원',     value: `${chartData.length}명`,
                  color: '#6366f1' },
                { label: '평균 사용',     value: `${chartData.length ? (chartData.reduce((s,d)=>s+d.usedDays,0)/chartData.length).toFixed(1) : 0}일`,
                  color: '#f87171' },
                { label: '평균 잔여',     value: `${chartData.length ? (chartData.reduce((s,d)=>s+d.remaining,0)/chartData.length).toFixed(1) : 0}일`,
                  color: '#10b981' },
                { label: '잔여 3일 이하', value: `${chartData.filter(d=>d.remaining<=3).length}명`,
                  color: '#f59e0b' },
              ].map(card => (
                <div key={card.label} style={{
                  flex: '1 1 120px', background: '#f9fafb', borderRadius: 10,
                  padding: '10px 16px', textAlign: 'center',
                  border: `1px solid ${card.color}33`,
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: 2 }}>{card.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${filter === opt.key ? '#4f46e5' : '#d1d5db'}`,
              background: filter === opt.key ? '#4f46e5' : '#fff',
              color: filter === opt.key ? '#fff' : '#374151',
              fontSize: '0.83rem', fontWeight: 600,
            }}
          >{opt.label} ({opt.cnt})</button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 12,
          padding: '60px 0', textAlign: 'center', color: '#9ca3af',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📄</div>
          <p style={{ margin: 0 }}>해당 상태의 신청이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(lv => {
            const st = STATUS_LABEL[lv.status] || { text: lv.status, color: '#6b7280', bg: '#f3f4f6' };
            return (
              <div key={lv.leaveId} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem',
                        fontWeight: 700, background: st.bg, color: st.color,
                      }}>{st.text}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
                        {lv.ename}
                      </span>
                      {lv.deptName && (
                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lv.deptName}</span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#374151' }}>{lv.leaveType}</span>
                      <span style={{ fontSize: '0.85rem', color: '#374151' }}>
                        {fmtDate(lv.startDate)}
                        {fmtDate(lv.startDate) !== fmtDate(lv.endDate) ? ` ~ ${fmtDate(lv.endDate)}` : ''}
                        &nbsp;<strong>({lv.days}일)</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: '#6b7280' }}>
                      {lv.reason && <span>사유: {lv.reason}</span>}
                      {lv.mgrEname && <span>팀장: {lv.mgrEname}</span>}
                    </div>

                    {(lv.mgrComment || lv.adminComment) && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {lv.mgrComment && (
                          <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                            팀장 의견: {lv.mgrComment}
                          </span>
                        )}
                        {lv.adminComment && (
                          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
                            관리자 의견: {lv.adminComment}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                      신청일: {fmtDate(lv.createdAt)}
                      {lv.mgrAt && ` · 1차처리: ${fmtDate(lv.mgrAt)}`}
                      {lv.adminAt && ` · 최종처리: ${fmtDate(lv.adminAt)}`}
                    </div>
                  </div>

                  {/* 1차승인 상태일 때만 최종 처리 버튼 표시 */}
                  {lv.status === 'MGR_APPROVED' && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => openDecide(lv.leaveId, true)}
                        disabled={actionId === lv.leaveId}
                        style={{
                          padding: '7px 14px', background: '#10b981', color: '#fff',
                          border: 'none', borderRadius: 6, cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.83rem',
                        }}
                      >✓ 최종승인</button>
                      <button
                        onClick={() => openDecide(lv.leaveId, false)}
                        disabled={actionId === lv.leaveId}
                        style={{
                          padding: '7px 14px', background: '#ef4444', color: '#fff',
                          border: 'none', borderRadius: 6, cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.83rem',
                        }}
                      >✗ 반려</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 코멘트 모달 */}
      {commentModal && (
        <div
          onClick={() => setCommentModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 24,
              width: 'min(420px, 95vw)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>
              {commentModal.approve ? '✓ 최종 승인' : '✗ 최종 반려'}
            </h3>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>
                관리자 의견 <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>(선택)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="의견이 있으면 입력해주세요."
                rows={3}
                style={{
                  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: '0.88rem', width: '100%', boxSizing: 'border-box',
                  resize: 'vertical', lineHeight: 1.5,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setCommentModal(null)}
                style={{ padding: '8px 18px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={handleDecide}
                style={{
                  padding: '8px 20px',
                  background: commentModal.approve ? '#10b981' : '#ef4444',
                  color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                }}
              >{commentModal.approve ? '최종 승인 확정' : '반려 확정'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
