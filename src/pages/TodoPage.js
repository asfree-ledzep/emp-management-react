import React, { useState, useEffect, useCallback } from 'react';
import { fetchTodos, addTodo, editTodo, toggleTodo, deleteTodo } from '../api/todoApi';

const PRIORITY_CFG = {
  HIGH:   { label:'높음', color:'#dc2626', bg:'#fee2e2', icon:'🔴' },
  MEDIUM: { label:'보통', color:'#d97706', bg:'#fef3c7', icon:'🟡' },
  LOW:    { label:'낮음', color:'#16a34a', bg:'#dcfce7', icon:'🟢' },
};

const EMPTY = { content:'', priority:'MEDIUM', dueDate:'' };

export default function TodoPage() {
  const [todos,   setTodos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [editId,  setEditId]  = useState(null);
  const [adding,  setAdding]  = useState(false);
  const [filter,  setFilter]  = useState('all');  // all | active | done
  const [msg,     setMsg]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchTodos()
      .then(d => setTodos(Array.isArray(d) ? d : []))
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text, type='success') => {
    setMsg({ text, type }); setTimeout(() => setMsg(null), 2500);
  };

  const notifyUpdate = () => window.dispatchEvent(new CustomEvent('todo:updated'));

  const handleAdd = async () => {
    if (!form.content.trim()) { showMsg('할일 내용을 입력해주세요.','error'); return; }
    setAdding(true);
    try {
      const res = await addTodo({ ...form, dueDate: form.dueDate || null });
      if (res.error) { showMsg(res.error,'error'); return; }
      setForm(EMPTY); load(); notifyUpdate();
    } catch { showMsg('오류가 발생했습니다.','error'); }
    finally { setAdding(false); }
  };

  const handleEdit = async (id) => {
    if (!form.content.trim()) { showMsg('내용을 입력해주세요.','error'); return; }
    try {
      const res = await editTodo(id, { ...form, dueDate: form.dueDate || null });
      if (res.error) { showMsg(res.error,'error'); return; }
      setEditId(null); setForm(EMPTY); load(); notifyUpdate();
    } catch { showMsg('오류가 발생했습니다.','error'); }
  };

  const handleToggle = async (id) => {
    await toggleTodo(id);
    setTodos(prev => prev.map(t => t.todoId === id ? { ...t, isDone: !t.isDone } : t));
    notifyUpdate();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteTodo(id);
    setTodos(prev => prev.filter(t => t.todoId !== id));
    showMsg('삭제되었습니다.'); notifyUpdate();
  };

  const startEdit = (todo) => {
    setEditId(todo.todoId);
    setForm({ content: todo.content, priority: todo.priority || 'MEDIUM', dueDate: todo.dueDate?.slice(0,10) || '' });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY); };

  const today = new Date().toISOString().slice(0,10);
  const isOverdue = (dueDate) => dueDate && dueDate < today;

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.isDone;
    if (filter === 'done')   return t.isDone;
    return true;
  });

  const stats = {
    total:  todos.length,
    active: todos.filter(t => !t.isDone).length,
    done:   todos.filter(t => t.isDone).length,
  };

  return (
    <div style={{ padding:24, maxWidth:720, margin:'0 auto' }}>
      {msg && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          background: msg.type==='error'?'#fee2e2':'#dcfce7',
          color: msg.type==='error'?'#dc2626':'#16a34a',
          border:`1px solid ${msg.type==='error'?'#fca5a5':'#86efac'}`,
          borderRadius:8, padding:'10px 18px', fontWeight:600,
        }}>{msg.text}</div>
      )}

      {/* 헤더 */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:700 }}>✅ 내 할일 (To-Do)</h2>
        <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:'0.85rem' }}>개인 업무 할일을 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { label:'전체', value: stats.total,  color:'#6366f1' },
          { label:'미완료', value: stats.active, color:'#d97706' },
          { label:'완료', value: stats.done,   color:'#16a34a' },
        ].map(s => (
          <div key={s.label} style={{
            flex:1, background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
            padding:'12px 16px', textAlign:'center',
          }}>
            <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.78rem', color:'#6b7280', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 입력 폼 */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:18, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:12, color:'#374151' }}>+ 새 할일 추가</div>
        <input type="text" value={form.content}
          onChange={e => setForm(f => ({...f, content: e.target.value}))}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdd()}
          placeholder="할일 내용을 입력하세요..."
          style={{ width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:7, padding:'9px 12px', fontSize:'0.9rem', outline:'none', marginBottom:10 }} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
            style={{ border:'1px solid #d1d5db', borderRadius:7, padding:'6px 10px', fontSize:'0.85rem', outline:'none' }}>
            <option value="HIGH">🔴 높음</option>
            <option value="MEDIUM">🟡 보통</option>
            <option value="LOW">🟢 낮음</option>
          </select>
          <input type="date" value={form.dueDate}
            onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}
            style={{ border:'1px solid #d1d5db', borderRadius:7, padding:'6px 10px', fontSize:'0.85rem', outline:'none' }} />
          <button onClick={handleAdd} disabled={adding}
            style={{ marginLeft:'auto', background:'#6366f1', color:'#fff', border:'none', borderRadius:7, padding:'8px 18px', fontWeight:700, cursor:'pointer' }}>
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display:'flex', gap:4, marginBottom:14, borderBottom:'2px solid #e5e7eb' }}>
        {[['all','전체'],['active','미완료'],['done','완료']].map(([key,label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            border:'none', background:'none', cursor:'pointer', padding:'6px 14px',
            fontWeight:600, fontSize:'0.85rem',
            color: filter===key?'#6366f1':'#6b7280',
            borderBottom: filter===key?'2px solid #6366f1':'2px solid transparent',
            marginBottom:-2,
          }}>{label}</button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>✅</div>
          {filter === 'done' ? '완료된 할일이 없습니다.' : filter === 'active' ? '미완료 할일이 없습니다.' : '할일을 추가해보세요!'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(todo => {
            const pc   = PRIORITY_CFG[todo.priority] || PRIORITY_CFG.MEDIUM;
            const over = !todo.isDone && isOverdue(todo.dueDate?.slice(0,10));
            const isEd = editId === todo.todoId;

            return (
              <div key={todo.todoId} style={{
                background:'#fff', border:`1px solid ${over?'#fca5a5':'#e5e7eb'}`,
                borderRadius:10, padding:'12px 14px', opacity: todo.isDone ? 0.65 : 1,
                transition:'opacity 0.2s',
              }}>
                {isEd ? (
                  /* 인라인 수정 */
                  <div>
                    <input value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
                      style={{ width:'100%', boxSizing:'border-box', border:'1px solid #6366f1', borderRadius:7, padding:'7px 10px', fontSize:'0.9rem', outline:'none', marginBottom:8 }} />
                    <div style={{ display:'flex', gap:8 }}>
                      <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
                        style={{ border:'1px solid #d1d5db', borderRadius:6, padding:'5px 8px', fontSize:'0.82rem' }}>
                        <option value="HIGH">🔴 높음</option>
                        <option value="MEDIUM">🟡 보통</option>
                        <option value="LOW">🟢 낮음</option>
                      </select>
                      <input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}
                        style={{ border:'1px solid #d1d5db', borderRadius:6, padding:'5px 8px', fontSize:'0.82rem' }} />
                      <button onClick={() => handleEdit(todo.todoId)}
                        style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontWeight:600, cursor:'pointer', fontSize:'0.82rem' }}>저장</button>
                      <button onClick={cancelEdit}
                        style={{ background:'#f3f4f6', color:'#374151', border:'none', borderRadius:6, padding:'5px 10px', fontWeight:600, cursor:'pointer', fontSize:'0.82rem' }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {/* 체크박스 */}
                    <input type="checkbox" checked={!!todo.isDone}
                      onChange={() => handleToggle(todo.todoId)}
                      style={{ width:18, height:18, cursor:'pointer', accentColor:'#6366f1', flexShrink:0 }} />

                    {/* 내용 */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ background:pc.bg, color:pc.color, fontSize:'0.68rem', fontWeight:700, borderRadius:9999, padding:'1px 6px' }}>
                          {pc.icon} {pc.label}
                        </span>
                        {over && <span style={{ background:'#fee2e2', color:'#dc2626', fontSize:'0.68rem', fontWeight:700, borderRadius:9999, padding:'1px 6px' }}>⚠ 기한 초과</span>}
                      </div>
                      <div style={{ marginTop:4, fontSize:'0.93rem', fontWeight:500, textDecoration: todo.isDone ? 'line-through' : 'none', color: todo.isDone ? '#9ca3af' : '#111827' }}>
                        {todo.content}
                      </div>
                      {todo.dueDate && (
                        <div style={{ fontSize:'0.75rem', color: over ? '#dc2626' : '#9ca3af', marginTop:2 }}>
                          📅 마감: {todo.dueDate.slice(0,10)}
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    {!todo.isDone && (
                      <button onClick={() => startEdit(todo)}
                        style={{ background:'#f3f4f6', color:'#374151', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'0.78rem' }}>수정</button>
                    )}
                    <button onClick={() => handleDelete(todo.todoId)}
                      style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'0.78rem' }}>삭제</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 완료 항목 일괄 삭제 */}
      {stats.done > 0 && (
        <div style={{ marginTop:16, textAlign:'right' }}>
          <button onClick={async () => {
            if (!window.confirm(`완료된 항목 ${stats.done}개를 모두 삭제하시겠습니까?`)) return;
            const done = todos.filter(t => t.isDone);
            for (const t of done) await deleteTodo(t.todoId);
            load(); notifyUpdate(); showMsg(`완료 항목 ${done.length}개가 삭제되었습니다.`);
          }} style={{ background:'#f3f4f6', color:'#6b7280', border:'none', borderRadius:7, padding:'7px 14px', cursor:'pointer', fontSize:'0.82rem' }}>
            완료 항목 전체 삭제 ({stats.done})
          </button>
        </div>
      )}
    </div>
  );
}
