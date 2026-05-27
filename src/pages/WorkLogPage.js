import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyLogs, saveLog, editLog, submitLog, deleteLog,
  fetchMgrPendingLogs, mgrApproveLog, mgrRejectLog,
} from '../api/workLogApi';
import { showConfirm, showAlert } from '../utils/confirmDialog';

const STATUS_LABEL = {
  DRAFT:          { label: '임시저장',    color: '#6b7280', bg: '#f3f4f6' },
  SUBMITTED:      { label: '결재 대기',   color: '#d97706', bg: '#fef3c7' },
  MGR_APPROVED:   { label: '팀장 승인',   color: '#2563eb', bg: '#dbeafe' },
  APPROVED:       { label: '승인 완료',   color: '#16a34a', bg: '#dcfce7' },
  MGR_REJECTED:   { label: '팀장 반려',   color: '#dc2626', bg: '#fee2e2' },
  ADMIN_REJECTED: { label: '관리자 반려', color: '#dc2626', bg: '#fee2e2' },
};

const EMPTY_FORM = { logDate: new Date().toISOString().slice(0, 10), title: '', content: '' };

const PENDING_ST  = ['SUBMITTED', 'MGR_APPROVED'];
const APPROVED_ST = ['APPROVED'];
const REJECTED_ST = ['MGR_REJECTED', 'ADMIN_REJECTED'];

// ── 스타일 헬퍼 ──────────────────────────────────────────────
const labelStyle = { display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 16 };
const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 12px', fontSize: '0.9rem', outline: 'none' };
const btnStyle   = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: 7, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' });
const btnSmall   = (bg, color, large = false) => ({ background: bg, color, border: 'none', borderRadius: 6, padding: large ? '8px 16px' : '5px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' });
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalBox     = { background: '#fff', borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };

export default function WorkLogPage({ role, worklogPendingCount = 0 }) {
  const isMgr = role === 'MGR' || role === 'ADMIN';

  // ─ 내 업무일지 상태 ─
  const [myLogs,   setMyLogs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('list');   // list | form | detail
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [detail,   setDetail]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);

  // ─ 팀원 결재 상태 ─
  const [mgrLogs,    setMgrLogs]    = useState([]);
  const [mgrLoading, setMgrLoading] = useState(false);
  const [mgrDetail,  setMgrDetail]  = useState(null);
  const [mgrModal,   setMgrModal]   = useState(null);   // { type:'approve'|'reject', logId }
  const [mgrComment, setMgrComment] = useState('');
  const [mgrReason,  setMgrReason]  = useState('');

  // ─ 탭: write | pending | approved | rejected | team ─
  const [tab, setTab] = useState('write');

  // ────────────────────────────────────────────────
  const loadMy = useCallback(() => {
    setLoading(true);
    fetchMyLogs()
      .then(d => setMyLogs(Array.isArray(d) ? d : []))
      .catch(() => setMyLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const loadMgr = useCallback(() => {
    if (!isMgr) return;
    setMgrLoading(true);
    fetchMgrPendingLogs()
      .then(d => setMgrLogs(Array.isArray(d) ? d : []))
      .catch(() => setMgrLogs([]))
      .finally(() => setMgrLoading(false));
  }, [isMgr]);

  useEffect(() => { loadMy(); }, [loadMy]);
  useEffect(() => { if (tab === 'team') loadMgr(); }, [tab, loadMgr]);

  // ────────────────────────────────────────────────
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type }); setTimeout(() => setMsg(null), 3000);
  };

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setView('form'); };
  const openEdit = (log) => {
    setForm({ logDate: log.logDate?.slice(0, 10) || '', title: log.title, content: log.content });
    setEditId(log.logId);
    setView('form');
  };
  const openDetail = (log) => { setDetail(log); setView('detail'); };

  const handleSave = async (submitAfter = false) => {
    if (!form.logDate || !form.title.trim() || !form.content.trim()) {
      await showAlert('날짜, 제목, 내용을 모두 입력해주세요.', { title: '입력 오류' });
      return;
    }
    setSaving(true);
    try {
      let result;
      if (editId) { result = await editLog(editId, form); }
      else        { result = await saveLog(form); }
      if (result.error) { showMsg(result.error, 'error'); return; }

      const id = result.logId;
      if (submitAfter) {
        const res = await submitLog(id);
        if (res.error) { showMsg(res.error, 'error'); loadMy(); setView('list'); return; }
        showMsg('결재 제출이 완료되었습니다.');
      } else {
        showMsg('임시저장 되었습니다.');
      }
      loadMy(); setView('list');
    } catch {
      showMsg('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitOnly = async (logId) => {
    const ok = await showConfirm('결재 제출하시겠습니까?', { title: '결재 제출', confirmText: '제출', danger: false });
    if (!ok) return;
    try {
      const res = await submitLog(logId);
      if (res.error) { showMsg(res.error, 'error'); return; }
      showMsg('결재 제출이 완료되었습니다.');
      loadMy(); setView('list');
    } catch { showMsg('오류가 발생했습니다.', 'error'); }
  };

  const handleDelete = async (logId) => {
    const ok = await showConfirm('삭제하시겠습니까?', { title: '업무일지 삭제', confirmText: '삭제', danger: true });
    if (!ok) return;
    try {
      const res = await deleteLog(logId);
      if (res.error) { showMsg(res.error, 'error'); return; }
      showMsg('삭제되었습니다.');
      loadMy(); setView('list');
    } catch { showMsg('오류가 발생했습니다.', 'error'); }
  };

  const canEdit   = (s) => ['DRAFT', 'MGR_REJECTED', 'ADMIN_REJECTED'].includes(s);
  const canSubmit = (s) => ['DRAFT', 'MGR_REJECTED', 'ADMIN_REJECTED'].includes(s);

  // ── 팀원 결재 처리 ──
  const handleMgrApprove = async () => {
    try {
      const res = await mgrApproveLog(mgrModal.logId, mgrComment);
      if (res.error) { showMsg(res.error, 'error'); return; }
      showMsg('승인되었습니다.');
      setMgrModal(null); setMgrComment(''); setMgrDetail(null); loadMgr();
    } catch { showMsg('오류가 발생했습니다.', 'error'); }
  };

  const handleMgrReject = async () => {
    if (!mgrReason.trim()) { showMsg('반려 사유를 입력해주세요.', 'error'); return; }
    try {
      const res = await mgrRejectLog(mgrModal.logId, mgrReason, mgrComment);
      if (res.error) { showMsg(res.error, 'error'); return; }
      showMsg('반려 처리되었습니다.');
      setMgrModal(null); setMgrReason(''); setMgrComment(''); setMgrDetail(null); loadMgr();
    } catch { showMsg('오류가 발생했습니다.', 'error'); }
  };

  // ── 탭별 로그 필터 ──
  const pendingLogs  = myLogs.filter(l => PENDING_ST.includes(l.status));
  const approvedLogs = myLogs.filter(l => APPROVED_ST.includes(l.status));
  const rejectedLogs = myLogs.filter(l => REJECTED_ST.includes(l.status));
  const draftLogs    = myLogs.filter(l => l.status === 'DRAFT');

  // ── 탭 정의 ──
  const TABS = [
    { key: 'write',    label: '업무일지 추가', icon: '✏️' },
    { key: 'pending',  label: '미결재',        icon: '⏳', count: pendingLogs.length },
    { key: 'approved', label: '결재완료',       icon: '✅', count: approvedLogs.length },
    { key: 'rejected', label: '반려',           icon: '↩️', count: rejectedLogs.length },
    ...(isMgr ? [{ key: 'team', label: '팀원결재', icon: '📝', count: worklogPendingCount }] : []),
  ];

  // ────────────────────────────────────────────────────────
  // 렌더
  // ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

      {/* 토스트 */}
      {msg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: msg.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: msg.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${msg.type === 'error' ? '#fca5a5' : '#86efac'}`,
          borderRadius: 8, padding: '10px 18px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>{msg.text}</div>
      )}

      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>📋 업무일지</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
          일별 업무 기록 작성 및 결재 현황을 확인합니다.
        </p>
      </div>

      {/* 탭 헤더 */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setView('list'); }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              padding: '9px 16px', fontWeight: 600, fontSize: '0.88rem',
              color: tab === t.key ? '#6366f1' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap',
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count > 0 && (
              <span style={{
                background: t.key === 'team' ? '#f97316' : (t.key === 'rejected' ? '#ef4444' : '#6366f1'),
                color: '#fff', borderRadius: 9999, fontSize: '0.68rem', fontWeight: 700,
                padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>{t.count > 99 ? '99+' : t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          탭: 업무일지 추가
         ══════════════════════════════════════════════ */}
      {tab === 'write' && (
        <>
          {view === 'list' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={openNew} style={btnStyle('#6366f1', '#fff')}>+ 새 업무일지 작성</button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
              ) : draftLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
                  <div>임시저장된 업무일지가 없습니다.</div>
                  <button onClick={openNew} style={{ ...btnStyle('#6366f1', '#fff'), marginTop: 16 }}>
                    첫 업무일지 작성하기
                  </button>
                </div>
              ) : (
                <LogList logs={draftLogs} onDetail={openDetail} onEdit={openEdit}
                  onSubmit={handleSubmitOnly} onDelete={handleDelete}
                  canEdit={canEdit} canSubmit={canSubmit} />
              )}
            </div>
          )}

          {view === 'form' && (
            <WriteForm
              form={form} setForm={setForm} editId={editId} saving={saving}
              onSave={handleSave} onBack={() => setView('list')} />
          )}

          {view === 'detail' && detail && (
            <DetailView log={detail} onBack={() => setView('list')}
              onEdit={openEdit} onSubmit={handleSubmitOnly}
              canEdit={canEdit} canSubmit={canSubmit} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          탭: 미결재 / 결재완료 / 반려
         ══════════════════════════════════════════════ */}
      {['pending', 'approved', 'rejected'].includes(tab) && (
        <>
          {view === 'list' && (
            loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
            ) : (() => {
              const logs = tab === 'pending' ? pendingLogs : tab === 'approved' ? approvedLogs : rejectedLogs;
              const emptyMsg = tab === 'pending' ? '결재 대기 중인 업무일지가 없습니다.'
                : tab === 'approved' ? '승인 완료된 업무일지가 없습니다.'
                : '반려된 업무일지가 없습니다.';
              const emptyIcon = tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '↩️';
              return logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{emptyIcon}</div>
                  <div>{emptyMsg}</div>
                </div>
              ) : (
                <LogList logs={logs} onDetail={openDetail} onEdit={openEdit}
                  onSubmit={handleSubmitOnly} onDelete={handleDelete}
                  canEdit={canEdit} canSubmit={canSubmit} />
              );
            })()
          )}
          {view === 'detail' && detail && (
            <DetailView log={detail} onBack={() => setView('list')}
              onEdit={openEdit} onSubmit={handleSubmitOnly}
              canEdit={canEdit} canSubmit={canSubmit} />
          )}
          {view === 'form' && (
            <WriteForm
              form={form} setForm={setForm} editId={editId} saving={saving}
              onSave={handleSave} onBack={() => setView('list')} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          탭: 팀원 결재
         ══════════════════════════════════════════════ */}
      {tab === 'team' && isMgr && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              팀원의 업무일지 결재 대기 건 ({mgrLogs.length}건)
            </div>
            <button onClick={loadMgr} style={btnSmall('#f3f4f6', '#374151', true)}>🔄 새로고침</button>
          </div>

          {mgrLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
          ) : mgrLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
              <div>결재 대기 중인 팀원 업무일지가 없습니다.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mgrLogs.map(log => {
                const st = STATUS_LABEL[log.status] || { label: log.status, color: '#6b7280', bg: '#f3f4f6' };
                const isOpen = mgrDetail?.logId === log.logId;
                return (
                  <div key={log.logId} style={{
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '14px 18px', cursor: 'pointer',
                  }}
                  onClick={() => setMgrDetail(isOpen ? null : log)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 700, borderRadius: 9999, padding: '2px 8px' }}>{st.label}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{log.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#9ca3af', flexShrink: 0 }}>
                        {log.ename} · {log.logDate?.slice(0, 10)}
                      </span>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}
                           onClick={e => e.stopPropagation()}>
                        <div style={{
                          background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6',
                          padding: 14, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                          maxHeight: 240, overflowY: 'auto',
                        }}>{log.content}</div>

                        {log.rejectReason && (
                          <div style={{ marginTop: 10, background: '#fee2e2', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', color: '#dc2626' }}>
                            이전 반려사유: {log.rejectReason}
                          </div>
                        )}

                        {log.status === 'SUBMITTED' && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setMgrModal({ type: 'reject', logId: log.logId }); setMgrReason(''); setMgrComment(''); }}
                              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>
                              반려
                            </button>
                            <button onClick={() => { setMgrModal({ type: 'approve', logId: log.logId }); setMgrComment(''); }}
                              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>
                              승인
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 승인 모달 */}
          {mgrModal?.type === 'approve' && (
            <div style={modalOverlay}>
              <div style={modalBox}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem' }}>✅ 업무일지 승인</h3>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>코멘트 (선택)</label>
                <textarea value={mgrComment} onChange={e => setMgrComment(e.target.value)}
                  placeholder="승인 코멘트를 입력하세요 (선택사항)"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 7, padding: 10, height: 80, resize: 'none', marginTop: 6, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={() => setMgrModal(null)} style={btnSmall('#f3f4f6', '#374151', true)}>취소</button>
                  <button onClick={handleMgrApprove} style={btnSmall('#6366f1', '#fff', true)}>승인 확정</button>
                </div>
              </div>
            </div>
          )}

          {/* 반려 모달 */}
          {mgrModal?.type === 'reject' && (
            <div style={modalOverlay}>
              <div style={modalBox}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem' }}>↩ 업무일지 반려</h3>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>반려 사유 <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={mgrReason} onChange={e => setMgrReason(e.target.value)}
                  placeholder="반려 사유를 명확히 입력해주세요"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #fca5a5', borderRadius: 7, padding: 10, height: 80, resize: 'none', marginTop: 6, fontFamily: 'inherit' }} />
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginTop: 12, display: 'block' }}>추가 코멘트 (선택)</label>
                <textarea value={mgrComment} onChange={e => setMgrComment(e.target.value)}
                  placeholder="추가 안내사항 등"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 7, padding: 10, height: 60, resize: 'none', marginTop: 6, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={() => setMgrModal(null)} style={btnSmall('#f3f4f6', '#374151', true)}>취소</button>
                  <button onClick={handleMgrReject} style={btnSmall('#dc2626', '#fff', true)}>반려 확정</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 서브 컴포넌트: 로그 목록 ──────────────────────────────────
function LogList({ logs, onDetail, onEdit, onSubmit, onDelete, canEdit, canSubmit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {logs.map(log => {
        const st = STATUS_LABEL[log.status] || { label: log.status, color: '#6b7280', bg: '#f3f4f6' };
        return (
          <div key={log.logId} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
          onClick={() => onDetail(log)}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: st.bg, color: st.color,
                  fontSize: '0.72rem', fontWeight: 700, borderRadius: 9999, padding: '2px 8px',
                }}>{st.label}</span>
                <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{log.logDate?.slice(0, 10)}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.title}
              </div>
              {(log.status === 'MGR_REJECTED' || log.status === 'ADMIN_REJECTED') && log.rejectReason && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>
                  ↩ 반려사유: {log.rejectReason}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              {canEdit(log.status) && (
                <button onClick={() => onEdit(log)}
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '5px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                  수정
                </button>
              )}
              {canSubmit(log.status) && (
                <button onClick={() => onSubmit(log.logId)}
                  style={{ background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: 6, padding: '5px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                  결재제출
                </button>
              )}
              {log.status === 'DRAFT' && (
                <button onClick={() => onDelete(log.logId)}
                  style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                  삭제
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 서브 컴포넌트: 작성 폼 ───────────────────────────────────
function WriteForm({ form, setForm, editId, saving, onSave, onBack }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
          {editId ? '업무일지 수정' : '업무일지 작성'}
        </h2>
      </div>

      <label style={labelStyle}>업무 날짜</label>
      <input type="date" value={form.logDate}
        onChange={e => setForm(f => ({ ...f, logDate: e.target.value }))}
        style={inputStyle} />

      <label style={labelStyle}>제목</label>
      <input type="text" value={form.title} placeholder="업무 제목을 입력하세요"
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        style={inputStyle} maxLength={200} />

      <label style={labelStyle}>업무 내용</label>
      <textarea value={form.content} placeholder="오늘의 업무 내용을 상세히 작성해주세요..."
        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        style={{ ...inputStyle, height: 240, resize: 'vertical', fontFamily: 'inherit' }} />

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button onClick={onBack}
          style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
          취소
        </button>
        <button onClick={() => onSave(false)} disabled={saving}
          style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
          {saving ? '저장 중...' : '임시저장'}
        </button>
        <button onClick={() => onSave(true)} disabled={saving}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
          {saving ? '처리 중...' : '저장 후 결재제출'}
        </button>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트: 상세보기 ──────────────────────────────────
function DetailView({ log, onBack, onEdit, onSubmit, canEdit, canSubmit }) {
  const st = STATUS_LABEL[log.status] || { label: log.status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>업무일지 상세</h2>
        <span style={{ marginLeft: 'auto', background: st.bg, color: st.color, fontSize: '0.78rem', fontWeight: 700, borderRadius: 9999, padding: '3px 10px' }}>
          {st.label}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          {[
            ['날짜',     log.logDate?.slice(0, 10)],
            ['작성자',   `${log.ename || ''} (${log.job || ''})`],
            ['직속상관', log.mgrEname || '-'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ width: 90, color: '#6b7280', fontSize: '0.85rem', padding: '6px 0', verticalAlign: 'top' }}>{k}</td>
              <td style={{ fontSize: '0.9rem', padding: '6px 0' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>{log.title}</div>
      <div style={{
        background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6',
        padding: 16, fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.7, minHeight: 120,
      }}>{log.content}</div>

      {/* 반려사유 */}
      {(log.status === 'MGR_REJECTED' || log.status === 'ADMIN_REJECTED') && (
        <div style={{ marginTop: 16, background: '#fee2e2', borderRadius: 8, padding: '12px 16px', border: '1px solid #fca5a5' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
            ↩ {log.rejectedBy === 'MGR' ? '팀장' : '관리자'} 반려사유
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>{log.rejectReason}</div>
          {log.mgrComment && log.rejectedBy === 'MGR' && (
            <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.82rem' }}>코멘트: {log.mgrComment}</div>
          )}
          {log.adminComment && log.rejectedBy === 'ADMIN' && (
            <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.82rem' }}>코멘트: {log.adminComment}</div>
          )}
        </div>
      )}

      {/* 결재 이력 */}
      {(log.mgrAt || log.adminAt) && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#6b7280', marginBottom: 8 }}>결재 이력</div>
          {log.mgrAt && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{
                background: log.status === 'MGR_REJECTED' ? '#fee2e2' : '#dbeafe',
                color: log.status === 'MGR_REJECTED' ? '#dc2626' : '#2563eb',
                borderRadius: 9999, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
              }}>팀장 {log.status === 'MGR_REJECTED' ? '반려' : '승인'}</span>
              <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{log.mgrEname} · {log.mgrAt?.slice(0, 16)}</span>
              {log.mgrComment && <span style={{ fontSize: '0.82rem', color: '#374151' }}>— {log.mgrComment}</span>}
            </div>
          )}
          {log.adminAt && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                background: log.status === 'ADMIN_REJECTED' ? '#fee2e2' : '#dcfce7',
                color: log.status === 'ADMIN_REJECTED' ? '#dc2626' : '#16a34a',
                borderRadius: 9999, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
              }}>관리자 {log.status === 'ADMIN_REJECTED' ? '반려' : '확인'}</span>
              <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{log.adminAt?.slice(0, 16)}</span>
              {log.adminComment && <span style={{ fontSize: '0.82rem', color: '#374151' }}>— {log.adminComment}</span>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        {canEdit(log.status) && (
          <button onClick={() => onEdit(log)}
            style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
            수정
          </button>
        )}
        {canSubmit(log.status) && (
          <button onClick={() => onSubmit(log.logId)}
            style={{ background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
            결재 제출
          </button>
        )}
      </div>
    </div>
  );
}
