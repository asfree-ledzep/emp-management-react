import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminAllLogs } from '../api/workLogApi';

const STATUS_LABEL = {
  DRAFT:          { label:'임시저장',   color:'#6b7280', bg:'#f3f4f6' },
  SUBMITTED:      { label:'결재 대기',  color:'#d97706', bg:'#fef3c7' },
  MGR_APPROVED:   { label:'팀장 승인',  color:'#2563eb', bg:'#dbeafe' },
  APPROVED:       { label:'승인 완료',  color:'#16a34a', bg:'#dcfce7' },
  MGR_REJECTED:   { label:'팀장 반려',  color:'#dc2626', bg:'#fee2e2' },
  ADMIN_REJECTED: { label:'관리자 반려',color:'#dc2626', bg:'#fee2e2' },
};

export default function WorkLogAdminPage({ onDashboard }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const [search,  setSearch]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminAllLogs()
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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
      <p style={{ margin:'0 0 20px', color:'#6b7280', fontSize:'0.85rem' }}>사원 업무일지 열람 (결재는 직속 팀장이 처리)</p>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름·제목·팀장 검색"
          style={{ border:'1px solid #d1d5db', borderRadius:7, padding:'6px 12px', fontSize:'0.85rem', outline:'none', width:200 }} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
          {'내역이 없습니다.'}
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

                    {log.mgrAt && (
                      <div style={{ marginTop:8, fontSize:'0.82rem', color:'#6b7280' }}>
                        팀장 처리: {log.mgrAt?.slice(0,16)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
