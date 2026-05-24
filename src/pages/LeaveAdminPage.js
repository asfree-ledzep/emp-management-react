import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllLeaves, adminApprove, adminReject } from '../api/leaveApi';

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

export default function LeaveAdminPage({ onNavigateToList }) {
  const [leaves,  setLeaves]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState('MGR_APPROVED'); // 기본: 1차승인 대기
  const [actionId, setActionId] = useState(null);
  const [commentModal, setCommentModal] = useState(null);
  const [comment, setComment] = useState('');

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

  useEffect(() => { load(); }, [load]);

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
