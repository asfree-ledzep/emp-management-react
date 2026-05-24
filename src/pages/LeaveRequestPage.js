import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyBalance, fetchMyLeaves, applyLeave, cancelLeave
} from '../api/leaveApi';

const LEAVE_TYPES = ['연차', '반차(오전)', '반차(오후)', '병가', '특별휴가'];

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

// 평일 수 계산 (주말 제외)
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

export default function LeaveRequestPage() {
  const [balance,  setBalance]  = useState(null);
  const [leaves,   setLeaves]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const [form, setForm] = useState({
    leaveType: '연차',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const autoEndDate = form.leaveType.includes('반차');

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

  // 반차는 0.5일 고정, 그 외는 평일 수 자동 계산
  const calcDays = () => {
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
        days,
        reason: form.reason,
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

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 4px' }}>
      {/* 잔여 연차 카드 */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
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
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          style={{
            padding: '10px 22px', background: '#fff', color: '#4f46e5',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            fontWeight: 700, fontSize: '0.92rem',
          }}
        >+ 연차 신청</button>
      </div>

      {/* 신청 내역 */}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: '#374151' }}>
        📋 신청 내역
      </h3>

      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px 0' }}>불러오는 중...</p>
      ) : leaves.length === 0 ? (
        <div style={{
          background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 12,
          padding: '40px 0', textAlign: 'center', color: '#9ca3af',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📄</div>
          <p style={{ margin: 0 }}>신청 내역이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaves.map(lv => {
            const st = STATUS_LABEL[lv.status] || { text: lv.status, color: '#6b7280', bg: '#f3f4f6' };
            return (
              <div key={lv.leaveId} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem',
                        fontWeight: 700, background: st.bg, color: st.color,
                      }}>{st.text}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{lv.leaveType}</span>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {fmtDate(lv.startDate)}
                        {lv.startDate !== lv.endDate ? ` ~ ${fmtDate(lv.endDate)}` : ''}
                        &nbsp;({lv.days}일)
                      </span>
                    </div>
                    {lv.reason && (
                      <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>사유: {lv.reason}</div>
                    )}
                    {lv.mgrComment && (
                      <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: 4 }}>
                        팀장 의견: {lv.mgrComment}
                      </div>
                    )}
                    {lv.adminComment && (
                      <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 2 }}>
                        관리자 의견: {lv.adminComment}
                      </div>
                    )}
                  </div>
                  {lv.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(lv.leaveId)}
                      style={{
                        padding: '4px 12px', background: '#fee2e2', color: '#ef4444',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 600, flexShrink: 0,
                      }}
                    >취소</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 신청 모달 */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, padding: 28,
              width: 'min(500px, 95vw)', maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>📝 연차 신청</h3>

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>
            )}

            {/* 휴가 종류 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                휴가 종류
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEAVE_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, leaveType: t }))}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                      border: `1px solid ${form.leaveType === t ? '#4f46e5' : '#d1d5db'}`,
                      background: form.leaveType === t ? '#4f46e5' : '#fff',
                      color: form.leaveType === t ? '#fff' : '#374151',
                      fontSize: '0.83rem', fontWeight: 600,
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* 날짜 */}
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
                  <input type="date" value={form.endDate}
                    min={form.startDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    style={inp} />
                </div>
              )}
            </div>

            {/* 일수 미리보기 */}
            {form.startDate && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
                padding: '8px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#166534',
              }}>
                📅 신청 일수: <strong>{calcDays()}일</strong>
                {balance && (
                  <span style={{ marginLeft: 10, color: '#374151' }}>
                    (신청 후 잔여: {(balance.remaining - calcDays()).toFixed(1)}일)
                  </span>
                )}
              </div>
            )}

            {/* 사유 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                사유 <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.78rem' }}>(선택)</span>
              </label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="휴가 사유를 입력하세요."
                rows={3}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 22px',
                  background: saving ? '#a5b4fc' : '#4f46e5',
                  color: '#fff', border: 'none', borderRadius: 6,
                  cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700,
                }}
              >{saving ? '신청 중...' : '신청하기'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
