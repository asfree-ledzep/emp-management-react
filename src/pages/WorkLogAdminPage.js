import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminPendingLogs, fetchAdminAllLogs, adminApproveLog, adminRejectLog } from '../api/workLogApi';

const STATUS_LABEL = {
  DRAFT:          { label:'임시저장',   color:'#6b7280', bg:'#f3f4f6' },
  SUBMITTED:      { label:'결재 대기',  color:'#d97706', bg:'#fef3c7' },
  MGR_APPROVED:   { label:'팀장 승인',  color:'#2563eb', bg:'#dbeafe' },
  APPROVED:       { label:'승인 완료',  color:'#16a34a', bg:'#dcfce7' },
  MGR_REJECTED:   { label:'팀장 반려',  color:'#dc2626', bg:'#fee2e2' },
  ADMIN_REJECTED: { label:'관리자 반려',color:'#dc2626', bg:'#fee2e2' },
};

export default function WorkLogAdminPage({ onDashboard }) {
  const [tab,     setTab]     = useState('pending');
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const [modal,   setModal]   = useState(null);
  const [comment, setComment] = useState('');
  const [reason,  setReason]  = useState('');
  const [search,  setSearch]  = useState('');
  const [msg,     setMsg]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const fn = tab === 'pending' ? fetchAdminPendingLogs : fetchAdminAllLogs;
    fn().then(d => setLogs(Array.isArray(d) ? d : []))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text, type='success') => {
    setMsg({ text, type }); setTimeout(() => setMsg(null), 3000);
  };

  const handleApprove = async () => {
    try {
      const res = await adminApproveLog(modal.logId, comment);
      if (res.error) { showMsg(res.error,'error'); return; }
      showMsg('확인 처리되었습니다.');
      setModal(null); setComment(''); setDetail(null); load();
    } catch { showMsg('오류가 발생했습니다.','error'); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { showMsg('반려 사유를 입력해주세요.','error'); return; }
    try {
      const res = await adminRejectLog(modal.logId, reason, comment);
      if (res.error) { showMsg(res.error,'error'); return; }
      showMsg('반려 처리되었습니다.');
      setModal(null); setReason(''); setComment(''); setDetail(null); load();
    } catch { showMsg('오류가 발생했습니다.','error'); }
  };

  const filtered = logs.filter(l =>
    !search || l.ename?.includes(search) || l.title?.includes(search) || l.mgrEname?.includes(search)
  );

  return (
    <div style={{ padding:24 }}>
      {msg && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          background: msg.type==='error'?'#fee2e2':'#dcfce7',
          color: msg.type==='error'?'#dc2626':'#16a34a',
          border:`1px solid ${msg.type==='error'?'#fca5a5':'#86efac'}`,
          borderRadius:8, padding:'10px 18px', fontWeight:600,
        }}>{msg.text}</div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        {onDashboard && (
          <button onClick={onDashboard} style={{
            background:'#f3f4f6', border:'none', borderRadius:7, padding:'6px 14px',
            cursor:'pointer', fontSize:'0.82rem', fontWeight:600, color:'#374151',
            display:'flex', alignItems:'center', gap:4,
          }}>← 대시보드</button>
        )}
        <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>📋 업무일지 관리</h2>
      </div>
      <p style={{ margin:'0 0 20px', color:'#6b7280', fontSize:'0.85rem' }}>사원 업무일지 최종 확인 및 관리</p>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', gap:4, borderBottom:'2px solid #e5e7eb' }}>
          {[['pending','확인 대기'],['all','전체 내역']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              border:'none', background:'none', cursor:'pointer', padding:'8px 18px',
              fontWeight:600, fontSize:'0.9rem',
              color: tab===key?'#6366f1':'#6b7280',
              borderBottom: tab===key?'2px solid #6366f1':'2px solid transparent',
              marginBottom:-2,
            }}>{label}</button>
          ))}
        </div>
        {tab === 'all' && (
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름·제목·팀장 검색"
            style={{ border:'1px solid #d1d5db', borderRadius:7, padding:'6px 12px', fontSize:'0.85rem', outline:'none', width:200 }} />
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
          {tab==='pending' ? '확인 대기 중인 업무일지가 없습니다.' : '내역이 없습니다.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(log => {
            const st = STATUS_LABEL[log.status] || { label:log.status, color:'#6b7280', bg:'#f3f4f6' };
            const isOpen = detail?.logId === log.logId;
            return (
              <div key={log.logId} style={{
                background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer' }}
                  onClick={() => setDetail(isOpen ? null : log)}>
                  <span style={{ background:st.bg, color:st.color, fontSize:'0.72rem', fontWeight:700, borderRadius:9999, padding:'2px 8px' }}>{st.label}</span>
                  <span style={{ fontWeight:600, fontSize:'0.9rem' }}>{log.title}</span>
                  <span style={{ fontSize:'0.82rem', color:'#9ca3af', marginLeft:'auto' }}>
                    {log.ename} ({log.job}) · 팀장: {log.mgrEname||'-'} · {log.logDate?.slice(0,10)}
                  </span>
                  <span style={{ color:'#9ca3af', fontSize:'0.8rem' }}>{isOpen?'▲':'▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ padding:'0 16px 16px', borderTop:'1px solid #f3f4f6' }}
                       onClick={e => e.stopPropagation()}>
                    {/* 팀장 코멘트 */}
                    {log.mgrComment && (
                      <div style={{ background:'#dbeafe', borderRadius:6, padding:'8px 12px', marginTop:12, fontSize:'0.85rem', color:'#1e40af' }}>
                        💬 팀장 코멘트: {log.mgrComment}
                      </div>
                    )}
                    <div style={{
                      background:'#f9fafb', borderRadius:8, border:'1px solid #f3f4f6',
                      padding:14, fontSize:'0.9rem', whiteSpace:'pre-wrap', lineHeight:1.7,
                      maxHeight:200, overflowY:'auto', marginTop:12,
                    }}>{log.content}</div>

                    {log.status === 'MGR_APPROVED' && (
                      <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
                        <button onClick={() => { setModal({ type:'reject', logId:log.logId }); setReason(''); setComment(''); }}
                          style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:7, padding:'8px 18px', fontWeight:700, cursor:'pointer' }}>
                          반려
                        </button>
                        <button onClick={() => { setModal({ type:'approve', logId:log.logId }); setComment(''); }}
                          style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:7, padding:'8px 18px', fontWeight:700, cursor:'pointer' }}>
                          최종 확인
                        </button>
                      </div>
                    )}

                    {log.status === 'APPROVED' && (
                      <div style={{ marginTop:12, fontSize:'0.82rem', color:'#16a34a', fontWeight:600 }}>
                        ✅ 최종 확인 완료 ({log.adminAt?.slice(0,16)})
                        {log.adminComment && <span style={{ color:'#374151', fontWeight:400 }}> — {log.adminComment}</span>}
                      </div>
                    )}
                    {(log.status === 'ADMIN_REJECTED') && (
                      <div style={{ marginTop:12, background:'#fee2e2', borderRadius:6, padding:'8px 12px', fontSize:'0.85rem', color:'#dc2626' }}>
                        ↩ 반려사유: {log.rejectReason}
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
      {modal?.type === 'approve' && (
        <div style={overlay}>
          <div style={box}>
            <h3 style={{ margin:'0 0 16px' }}>✅ 최종 확인</h3>
            <label style={{ fontSize:'0.85rem', fontWeight:600 }}>코멘트 (선택)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="확인 코멘트"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:10, height:80, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={cancelBtn}>취소</button>
              <button onClick={handleApprove} style={{ ...cancelBtn, background:'#16a34a', color:'#fff' }}>확인 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* 반려 모달 */}
      {modal?.type === 'reject' && (
        <div style={overlay}>
          <div style={box}>
            <h3 style={{ margin:'0 0 16px' }}>↩ 반려</h3>
            <label style={{ fontSize:'0.85rem', fontWeight:600, color:'#dc2626' }}>반려 사유 *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="반려 사유를 명확히 입력해주세요"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #fca5a5', borderRadius:7, padding:10, height:80, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <label style={{ fontSize:'0.85rem', fontWeight:600, marginTop:10, display:'block' }}>추가 코멘트 (선택)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="추가 안내"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:10, height:60, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={cancelBtn}>취소</button>
              <button onClick={handleReject} style={{ ...cancelBtn, background:'#dc2626', color:'#fff' }}>반려 확정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay   = { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' };
const box       = { background:'#fff', borderRadius:12, padding:28, width:440, maxWidth:'90vw', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' };
const cancelBtn = { background:'#f3f4f6', color:'#374151', border:'none', borderRadius:7, padding:'8px 16px', fontWeight:600, cursor:'pointer' };
