import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../api/apiClient';
import '../styles/MessagePage.css';

/* ── 파일 크기 포맷 ── */
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
};

/* ── 아이콘 ── */
const fileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
                ppt: '📋', pptx: '📋', jpg: '🖼', jpeg: '🖼', png: '🖼',
                gif: '🖼', zip: '🗜', rar: '🗜', txt: '📃', mp4: '🎥', mp3: '🎵' };
  return map[ext] || '📎';
};

export default function MessagePage({ empno, darkMode }) {
  const [tab,        setTab]       = useState('inbox');   // 'inbox' | 'sent'
  const [messages,   setMessages]  = useState([]);
  const [selected,   setSelected]  = useState(null);      // 선택된 메시지 상세
  const [loading,    setLoading]   = useState(false);
  const [showCompose,setCompose]   = useState(false);
  const [unread,     setUnread]    = useState(0);
  const [search,     setSearch]    = useState('');
  const [view,       setView]      = useState('list');    // 'list' | 'detail' (모바일 전환)

  /* 쪽지 쓰기 폼 상태 */
  const [form, setForm] = useState({
    receiverEmpno: '',
    receiverName: '',
    title: '',
    content: '',
    parentMsgId: null,
    files: [],
  });
  const [empList,   setEmpList]   = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [empDrop,   setEmpDrop]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const fileRef = useRef();

  /* ── 목록 로드 ── */
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'inbox' ? '/api/msg/inbox' : '/api/msg/sent';
      const res = await authFetch(url);
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { loadList(); }, [loadList]);

  /* ── 미읽음 수 폴링 ── */
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await authFetch('/api/msg/unread-count');
        if (r.ok) { const d = await r.json(); setUnread(d.count || 0); }
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 30000);
    return () => clearInterval(t);
  }, [messages]);

  /* ── 직원 목록 ── */
  useEffect(() => {
    if (!showCompose) return;
    authFetch(`/api/msg/emp-list?name=${encodeURIComponent(empSearch)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setEmpList)
      .catch(() => {});
  }, [empSearch, showCompose]);

  /* ── 상세 조회 ── */
  const openMsg = async (msg) => {
    try {
      const r = await authFetch(`/api/msg/${msg.msgId}`);
      if (r.ok) {
        const data = await r.json();
        setSelected(data);
        setView('detail');
        // 목록 읽음 상태 업데이트
        setMessages(prev => prev.map(m =>
          m.msgId === msg.msgId ? { ...m, readAt: m.readAt || '방금' } : m
        ));
        if (tab === 'inbox' && !msg.readAt) setUnread(u => Math.max(0, u - 1));
      }
    } catch (e) { console.error(e); }
  };

  /* ── 삭제 ── */
  const deleteMsg = async (msgId) => {
    if (!window.confirm('이 쪽지를 삭제하시겠습니까?')) return;
    const r = await authFetch(`/api/msg/${msgId}`, { method: 'DELETE' });
    if (r.ok) {
      setMessages(prev => prev.filter(m => m.msgId !== msgId));
      if (selected?.msgId === msgId) { setSelected(null); setView('list'); }
      loadList();
    }
  };

  /* ── 발송 ── */
  const handleSend = async () => {
    if (!form.receiverEmpno) { alert('받는 사람을 선택하세요.'); return; }
    if (!form.title.trim())  { alert('제목을 입력하세요.'); return; }
    if (!form.content.trim()){ alert('내용을 입력하세요.'); return; }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('receiverEmpno', form.receiverEmpno);
      fd.append('title',         form.title);
      fd.append('content',       form.content);
      if (form.parentMsgId) fd.append('parentMsgId', form.parentMsgId);
      form.files.forEach(f => fd.append('files', f));

      const r = await authFetch('/api/msg/send', { method: 'POST', body: fd });
      const data = await r.json();
      if (r.ok) {
        alert('쪽지를 발송했습니다.');
        setCompose(false);
        setForm({ receiverEmpno: '', receiverName: '', title: '', content: '', parentMsgId: null, files: [] });
        if (tab === 'sent') loadList();
      } else {
        alert(data.error || '발송 실패');
      }
    } catch (e) { alert('발송 중 오류가 발생했습니다.'); }
    finally { setSending(false); }
  };

  /* ── 답장 ── */
  const handleReply = (msg) => {
    setForm({
      receiverEmpno: msg.senderEmpno,
      receiverName:  msg.senderName,
      title:         msg.title.startsWith('RE:') ? msg.title : `RE: ${msg.title}`,
      content:       '',
      parentMsgId:   msg.msgId,
      files:         [],
    });
    setCompose(true);
  };

  /* ── 검색 필터 ── */
  const filtered = messages.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (m.title || '').toLowerCase().includes(q)
        || (m.senderName || '').toLowerCase().includes(q)
        || (m.receiverName || '').toLowerCase().includes(q)
        || (m.content || '').toLowerCase().includes(q);
  });

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className={`msg-page${darkMode ? ' dark' : ''}`}>

      {/* ══ 헤더 ══ */}
      <div className="msg-header">
        <div className="msg-header-title">
          <span>✉️ 사내 쪽지함</span>
          {unread > 0 && (
            <span className="msg-unread-badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </div>
        <button className="msg-compose-btn" onClick={() => {
          setForm({ receiverEmpno: '', receiverName: '', title: '', content: '', parentMsgId: null, files: [] });
          setCompose(true);
        }}>
          ✏️ 쪽지 쓰기
        </button>
      </div>

      <div className="msg-body">

        {/* ══ 사이드바 ══ */}
        <aside className="msg-sidebar">
          <button
            className={`msg-tab-btn${tab === 'inbox' ? ' active' : ''}`}
            onClick={() => { setTab('inbox'); setSelected(null); setView('list'); }}
          >
            📥 받은 쪽지함
            {unread > 0 && <span className="msg-tab-badge">{unread}</span>}
          </button>
          <button
            className={`msg-tab-btn${tab === 'sent' ? ' active' : ''}`}
            onClick={() => { setTab('sent'); setSelected(null); setView('list'); }}
          >
            📤 보낸 쪽지함
          </button>
        </aside>

        {/* ══ 목록 영역 ══ */}
        <div className={`msg-list-panel${view === 'detail' ? ' mobile-hidden' : ''}`}>

          {/* 검색 */}
          <div className="msg-search-wrap">
            <input
              className="msg-search-input"
              type="text"
              placeholder="🔍 제목·이름·내용 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="msg-empty">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="msg-empty">
              {search ? '검색 결과가 없습니다.' : (tab === 'inbox' ? '받은 쪽지가 없습니다.' : '보낸 쪽지가 없습니다.')}
            </div>
          ) : (
            <ul className="msg-list">
              {filtered.map(m => {
                const isUnread = tab === 'inbox' && !m.readAt;
                const isSelected = selected?.msgId === m.msgId;
                return (
                  <li
                    key={m.msgId}
                    className={`msg-item${isUnread ? ' unread' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => openMsg(m)}
                  >
                    {/* 아바타 */}
                    <div className="msg-avatar">
                      {tab === 'inbox'
                        ? (m.senderPhoto
                            ? <img src={m.senderPhoto} alt="" />
                            : <span>{(m.senderName || '?')[0]}</span>)
                        : (m.receiverPhoto
                            ? <img src={m.receiverPhoto} alt="" />
                            : <span>{(m.receiverName || '?')[0]}</span>)
                      }
                    </div>

                    {/* 내용 */}
                    <div className="msg-item-body">
                      <div className="msg-item-top">
                        <span className="msg-item-name">
                          {tab === 'inbox' ? m.senderName : m.receiverName}
                        </span>
                        <span className="msg-item-date">{(m.sentAt || '').slice(5)}</span>
                      </div>
                      <div className="msg-item-title">
                        {isUnread && <span className="msg-dot" />}
                        {m.title}
                      </div>
                      <div className="msg-item-preview">{m.content}</div>
                    </div>

                    {/* 메타 */}
                    <div className="msg-item-meta">
                      {m.fileCount > 0 && <span className="msg-attach-icon">📎</span>}
                      {tab === 'inbox' && m.readAt && (
                        <span className="msg-read-mark" title={`읽음: ${m.readAt}`}>✓</span>
                      )}
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      className="msg-item-del"
                      onClick={e => { e.stopPropagation(); deleteMsg(m.msgId); }}
                      title="삭제"
                    >✕</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ══ 상세 영역 ══ */}
        <div className={`msg-detail-panel${view === 'list' ? ' mobile-hidden' : ''}`}>
          {view === 'detail' && (
            <button className="msg-back-btn" onClick={() => { setView('list'); setSelected(null); }}>
              ← 목록으로
            </button>
          )}

          {!selected ? (
            <div className="msg-empty msg-detail-empty">
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✉️</div>
              <div style={{ color: '#6b7280' }}>쪽지를 선택하면 내용이 표시됩니다.</div>
            </div>
          ) : (
            <div className="msg-detail">
              {/* 제목 */}
              <h2 className="msg-detail-title">{selected.title}</h2>

              {/* 메타 정보 */}
              <div className="msg-detail-meta">
                <div className="msg-meta-row">
                  <span className="msg-meta-label">보낸 사람</span>
                  <span className="msg-meta-val">
                    {selected.senderPhoto && (
                      <img src={selected.senderPhoto} alt="" className="msg-meta-photo" />
                    )}
                    {selected.senderName}
                    <span className="msg-meta-sub">(사번: {selected.senderEmpno})</span>
                  </span>
                </div>
                <div className="msg-meta-row">
                  <span className="msg-meta-label">받는 사람</span>
                  <span className="msg-meta-val">
                    {selected.receiverPhoto && (
                      <img src={selected.receiverPhoto} alt="" className="msg-meta-photo" />
                    )}
                    {selected.receiverName}
                    <span className="msg-meta-sub">(사번: {selected.receiverEmpno})</span>
                  </span>
                </div>
                <div className="msg-meta-row">
                  <span className="msg-meta-label">보낸 시각</span>
                  <span className="msg-meta-val">{selected.sentAt}</span>
                </div>
                {selected.readAt && (
                  <div className="msg-meta-row">
                    <span className="msg-meta-label">읽은 시각</span>
                    <span className="msg-meta-val msg-read-time">✓ {selected.readAt}</span>
                  </div>
                )}
              </div>

              {/* 본문 */}
              <div className="msg-detail-content">
                {(selected.content || '').split('\n').map((line, i) => (
                  <p key={i} style={{ margin: 0, minHeight: '1.4em' }}>{line || ' '}</p>
                ))}
              </div>

              {/* 첨부파일 */}
              {selected.files && selected.files.length > 0 && (
                <div className="msg-attachments">
                  <div className="msg-attach-title">📎 첨부파일 ({selected.files.length})</div>
                  <ul className="msg-attach-list">
                    {selected.files.map(f => (
                      <li key={f.fileId} className="msg-attach-item">
                        <span className="msg-attach-icon-lg">{fileIcon(f.fileName)}</span>
                        <div className="msg-attach-info">
                          <span className="msg-attach-name">{f.fileName}</span>
                          <span className="msg-attach-size">{fmtSize(f.fileSize)}</span>
                        </div>
                        <a
                          href={f.s3Url}
                          target="_blank"
                          rel="noreferrer"
                          className="msg-download-btn"
                          download={f.fileName}
                        >⬇ 다운로드</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="msg-detail-actions">
                {tab === 'inbox' && (
                  <button
                    className="msg-action-btn primary"
                    onClick={() => handleReply(selected)}
                  >↩ 답장</button>
                )}
                <button
                  className="msg-action-btn danger"
                  onClick={() => deleteMsg(selected.msgId)}
                >🗑 삭제</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ 쪽지 쓰기 모달 ══ */}
      {showCompose && (
        <div className="msg-overlay" onClick={e => e.target === e.currentTarget && setCompose(false)}>
          <div className="msg-compose">
            <div className="msg-compose-header">
              <span>✏️ 쪽지 {form.parentMsgId ? '답장' : '작성'}</span>
              <button onClick={() => setCompose(false)} className="msg-compose-close">✕</button>
            </div>

            {/* 받는 사람 */}
            <div className="msg-field">
              <label className="msg-field-label">받는 사람 *</label>
              <div style={{ position: 'relative' }}>
                <div
                  className="msg-receiver-input"
                  onClick={() => setEmpDrop(true)}
                >
                  {form.receiverName
                    ? <span>{form.receiverName} ({form.receiverEmpno})</span>
                    : <span style={{ color: '#9ca3af' }}>직원을 선택하세요...</span>
                  }
                  <span style={{ marginLeft: 'auto' }}>▾</span>
                </div>
                {empDrop && (
                  <div className="msg-emp-drop">
                    <input
                      autoFocus
                      className="msg-emp-search"
                      placeholder="이름 검색"
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                    />
                    <ul className="msg-emp-list">
                      {empList.map(e => (
                        <li
                          key={e.empno}
                          className="msg-emp-item"
                          onClick={() => {
                            setForm(f => ({ ...f, receiverEmpno: e.empno, receiverName: e.ename }));
                            setEmpDrop(false);
                            setEmpSearch('');
                          }}
                        >
                          {e.photoUrl
                            ? <img src={e.photoUrl} alt="" className="msg-emp-photo" />
                            : <span className="msg-emp-avatar">{(e.ename || '?')[0]}</span>
                          }
                          <div>
                            <div style={{ fontWeight: 600 }}>{e.ename}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {e.job} · 사번 {e.empno}
                            </div>
                          </div>
                        </li>
                      ))}
                      {empList.length === 0 && (
                        <li style={{ padding: 12, color: '#9ca3af' }}>검색 결과 없음</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 제목 */}
            <div className="msg-field">
              <label className="msg-field-label">제목 *</label>
              <input
                className="msg-input"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="제목을 입력하세요"
                maxLength={200}
              />
            </div>

            {/* 내용 */}
            <div className="msg-field">
              <label className="msg-field-label">내용 *</label>
              <textarea
                className="msg-textarea"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="내용을 입력하세요"
                rows={8}
              />
            </div>

            {/* 첨부파일 */}
            <div className="msg-field">
              <label className="msg-field-label">첨부파일</label>
              <div className="msg-file-area">
                <button
                  className="msg-file-btn"
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >📎 파일 선택 (최대 5개, 각 10MB)</button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const sel = Array.from(e.target.files || []);
                    if (sel.length + form.files.length > 5) { alert('최대 5개까지 첨부 가능합니다.'); return; }
                    const big = sel.find(f => f.size > 10 * 1024 * 1024);
                    if (big) { alert(`파일 크기가 10MB를 초과합니다: ${big.name}`); return; }
                    setForm(f => ({ ...f, files: [...f.files, ...sel] }));
                    e.target.value = '';
                  }}
                />
                {form.files.length > 0 && (
                  <ul className="msg-selected-files">
                    {form.files.map((f, i) => (
                      <li key={i} className="msg-selected-file">
                        <span>{fileIcon(f.name)} {f.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{fmtSize(f.size)}</span>
                        <button
                          className="msg-file-remove"
                          onClick={() => setForm(prev => ({ ...prev, files: prev.files.filter((_, idx) => idx !== i) }))}
                        >✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 발송 버튼 */}
            <div className="msg-compose-footer">
              <button className="msg-cancel-btn" onClick={() => setCompose(false)}>취소</button>
              <button
                className="msg-send-btn"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? '발송 중...' : '📨 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
