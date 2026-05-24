import React, { useState, useEffect, useCallback } from 'react';
import { fetchMgrPending, mgrApprove, mgrReject } from '../api/leaveApi';

const fmtDate = (d) => {
  if (!d) return '-';
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
  return String(d).slice(0, 10);
};

export default function LeaveMgrPage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null); // 처리 중인 leaveId
  const [commentModal, setCommentModal] = useState(null); // { leaveId, approve }
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMgrPending();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDecide = (leaveId, approve) => {
    setCommentModal({ leaveId, approve });
    setComment('');
  };

  const handleDecide = async () => {
    const { leaveId, approve } = commentModal;
    setActionId(leaveId);
    try {
      const res = approve
        ? await mgrApprove(leaveId, comment)
        : await mgrReject(leaveId, comment);
      if (!res.ok) throw new Error('처리 실패');
      setCommentModal(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
          ✅ 1차 승인 대기 목록
        </h3>
        <span style={{
          background: list.length > 0 ? '#fef3c7' : '#f3f4f6',
          color: list.length > 0 ? '#92400e' : '#6b7280',
          padding: '3px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
        }}>{list.length}건 대기중</span>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>불러오는 중...</p>
      ) : list.length === 0 ? (
        <div style={{
          background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 12,
          padding: '50px 0', textAlign: 'center', color: '#9ca3af',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
          <p style={{ margin: 0 }}>승인 대기 중인 신청이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(lv => (
            <div key={lv.leaveId} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#dbeafe', color: '#1d4ed8',
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
                    }}>{lv.ename}</span>
                    {lv.deptName && (
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lv.deptName}</span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{lv.leaveType}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 4 }}>
                    📅 {fmtDate(lv.startDate)}
                    {fmtDate(lv.startDate) !== fmtDate(lv.endDate) ? ` ~ ${fmtDate(lv.endDate)}` : ''}
                    &nbsp;<strong>({lv.days}일)</strong>
                  </div>
                  {lv.reason && (
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>사유: {lv.reason}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                    신청일: {fmtDate(lv.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => openDecide(lv.leaveId, true)}
                    disabled={actionId === lv.leaveId}
                    style={{
                      padding: '7px 16px', background: '#10b981', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem',
                    }}
                  >✓ 승인</button>
                  <button
                    onClick={() => openDecide(lv.leaveId, false)}
                    disabled={actionId === lv.leaveId}
                    style={{
                      padding: '7px 16px', background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.85rem',
                    }}
                  >✗ 반려</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 승인/반려 코멘트 모달 */}
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
              {commentModal.approve ? '✓ 1차 승인' : '✗ 1차 반려'}
            </h3>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>
                의견 <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>(선택)</span>
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
              >{commentModal.approve ? '승인 확정' : '반려 확정'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
