import React, { useState, useEffect, useCallback } from 'react';
import { fetchMgrPendingLogs, fetchMgrAllLogs, mgrApproveLog, mgrRejectLog } from '../api/workLogApi';

const STATUS_LABEL = {
  DRAFT:          { label:'임시저장',   color:'#6b7280', bg:'#f3f4f6' },
  SUBMITTED:      { label:'결재 대기',  color:'#d97706', bg:'#fef3c7' },
  MGR_APPROVED:   { label:'팀장 승인',  color:'#2563eb', bg:'#dbeafe' },
  APPROVED:       { label:'승인 완료',  color:'#16a34a', bg:'#dcfce7' },
  MGR_REJECTED:   { label:'팀장 반려',  color:'#dc2626', bg:'#fee2e2' },
  ADMIN_REJECTED: { label:'관리자 반려',color:'#dc2626', bg:'#fee2e2' },
};

export default function WorkLogMgrPage() {
  const [tab,     setTab]     = useState('pending');   // pending | all
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const [modal,   setModal]   = useState(null);  // { type:'approve'|'reject', logId }
  const [comment, setComment] = useState('');
  const [reason,  setReason]  = useState('');
  const [msg,     setMsg]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const fn = tab === 'pending' ? fetchMgrPendingLogs : fetchMgrAllLogs;
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
      const res = await mgrApproveLog(modal.logId, comment);
      if (res.error) { showMsg(res.error,'error'); return; }
      showMsg('승인되었습니다.');
      setModal(null); setComment(''); setDetail(null); load();
    } catch { showMsg('오류가 발생했습니다.','error'); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { showMsg('반려 사유를 입력해주세요.','error'); return; }
    try {
      const res = await mgrRejectLog(modal.logId, reason, comment);
      if (res.error) { showMsg(res.error,'error'); return; }
      showMsg('반려 처리되었습니다.');
      setModal(null); setReason(''); setComment(''); setDetail(null); load();
    } catch { showMsg('오류가 발생했습니다.','error'); }
  };

  return (
    <div style={{ padding:24, maxWidth:960, margin:'0 auto' }}>
      {msg && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          background: msg.type==='error'?'#fee2e2':'#dcfce7',
          color: msg.type==='error'?'#dc2626':'#16a34a',
          border:`1px solid ${msg.type==='error'?'#fca5a5':'#86efac'}`,
          borderRadius:8, padding:'10px 18px', fontWeight:600,
        }}>{msg.text}</div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:700 }}>✅ 업무일지 결재</h2>
          <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:'0.85rem' }}>팀원의 업무일지를 확인하고 결재합니다.</p>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid #e5e7eb' }}>
        {[['pending','결재 대기'],['all','전체 내역']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            border:'none', background:'none', cursor:'pointer', padding:'8px 18px',
            fontWeight:600, fontSize:'0.9rem',
            color: tab===key ? '#6366f1' : '#6b7280',
            borderBottom: tab===key ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom:-2,
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>✅</div>
          {tab==='pending' ? '결재 대기 중인 업무일지가 없습니다.' : '업무일지 내역이 없습니다.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {logs.map(log => {
            const st = STATUS_LABEL[log.status] || { label:log.status, color:'#6b7280', bg:'#f3f4f6' };
            return (
              <div key={log.logId} style={{
                background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
                padding:'14px 18px', cursor:'pointer',
              }}
              onClick={() => setDetail(detail?.logId === log.logId ? null : log)}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ background:st.bg, color:st.color, fontSize:'0.72rem', fontWeight:700, borderRadius:9999, padding:'2px 8px' }}>{st.label}</span>
                  <span style={{ fontWeight:600, fontSize:'0.95rem' }}>{log.title}</span>
                  <span style={{ marginLeft:'auto', fontSize:'0.82rem', color:'#9ca3af' }}>{log.ename} · {log.logDate?.slice(0,10)}</span>
                </div>

                {/* 펼침 상세 */}
                {detail?.logId === log.logId && (
                  <div style={{ marginTop:14, borderTop:'1px solid #f3f4f6', paddingTop:14 }}
                       onClick={e => e.stopPropagation()}>
                    <div style={{
                      background:'#f9fafb', borderRadius:8, border:'1px solid #f3f4f6',
                      padding:14, fontSize:'0.9rem', whiteSpace:'pre-wrap', lineHeight:1.7, maxHeight:240, overflowY:'auto',
                    }}>{log.content}</div>

                    {log.rejectReason && (
                      <div style={{ marginTop:10, background:'#fee2e2', borderRadius:6, padding:'8px 12px', fontSize:'0.85rem', color:'#dc2626' }}>
                        이전 반려사유: {log.rejectReason}
                      </div>
                    )}

                    {log.status === 'SUBMITTED' && (
                      <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
                        <button onClick={() => { setModal({ type:'reject', logId:log.logId }); setReason(''); setComment(''); }}
                          style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:7, padding:'8px 18px', fontWeight:700, cursor:'pointer' }}>
                          반려
                        </button>
                        <button onClick={() => { setModal({ type:'approve', logId:log.logId }); setComment(''); }}
                          style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:7, padding:'8px 18px', fontWeight:700, cursor:'pointer' }}>
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

      {/* ── 승인 모달 ── */}
      {modal?.type === 'approve' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ margin:'0 0 16px', fontSize:'1.05rem' }}>✅ 업무일지 승인</h3>
            <label style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151' }}>코멘트 (선택)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="승인 코멘트를 입력하세요 (선택사항)"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:10, height:80, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background:'#f3f4f6', color:'#374151', border:'none', borderRadius:7, padding:'8px 16px', fontWeight:600, cursor:'pointer' }}>취소</button>
              <button onClick={handleApprove} style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:7, padding:'8px 20px', fontWeight:700, cursor:'pointer' }}>승인 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 반려 모달 ── */}
      {modal?.type === 'reject' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ margin:'0 0 16px', fontSize:'1.05rem' }}>↩ 업무일지 반려</h3>
            <label style={{ fontSize:'0.85rem', fontWeight:600, color:'#dc2626' }}>반려 사유 <span style={{ color:'#ef4444' }}>*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="반려 사유를 명확히 입력해주세요"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #fca5a5', borderRadius:7, padding:10, height:80, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <label style={{ fontSize:'0.85rem', fontWeight:600, color:'#374151', marginTop:12, display:'block' }}>추가 코멘트 (선택)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="추가 안내사항 등"
              style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:10, height:60, resize:'none', marginTop:6, fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background:'#f3f4f6', color:'#374151', border:'none', borderRadius:7, padding:'8px 16px', fontWeight:600, cursor:'pointer' }}>취소</button>
              <button onClick={handleReject} style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:7, padding:'8px 20px', fontWeight:700, cursor:'pointer' }}>반려 확정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' };
const modalBox     = { background:'#fff', borderRadius:12, padding:28, width:440, maxWidth:'90vw', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' };
