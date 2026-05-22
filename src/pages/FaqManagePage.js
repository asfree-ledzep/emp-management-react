import React, { useState, useEffect, useCallback } from 'react';
import { fetchFaqs, createFaq, updateFaq, deleteFaq } from '../api/faqApi';

const CATEGORIES = ['연차/휴가', '급여', '지출', '복리후생', '사내규정', '기타'];

const EMPTY = { category: '연차/휴가', question: '', keywords: '', answer: '' };

function FaqManagePage({ onNavigateToList }) {
  const [faqs,      setFaqs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);   // null = 등록, object = 수정
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchFaqs()
      .then(setFaqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setError(''); setShowForm(true); };
  const openEdit   = (faq) => {
    setEditItem(faq);
    setForm({ category: faq.category || '기타', question: faq.question, keywords: faq.keywords || '', answer: faq.answer });
    setError('');
    setShowForm(true);
  };
  const closeForm  = () => { setShowForm(false); setEditItem(null); setError(''); };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('질문과 답변은 필수입니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        const res = await updateFaq(editItem.faqId, form);
        if (!res.ok) throw new Error('수정 실패');
      } else {
        const res = await createFaq(form);
        if (!res.ok) throw new Error('등록 실패');
      }
      closeForm();
      load();
    } catch (e) {
      setError(e.message || '서버 오류');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const res = await deleteFaq(id);
    if (res.ok) load(); else alert('삭제 실패');
  };

  /* ── 카테고리별 그룹핑 ── */
  const filtered = filterCat ? faqs.filter(f => f.category === filterCat) : faqs;
  const grouped  = filtered.reduce((acc, f) => {
    const cat = f.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  /* ── 스타일 ── */
  const sel = { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88rem', background: '#fff' };
  const inp = { ...sel, width: '100%', boxSizing: 'border-box' };
  const catColor = { '연차/휴가': '#3b82f6', '급여': '#10b981', '지출': '#f97316', '복리후생': '#8b5cf6', '사내규정': '#ec4899', '기타': '#6b7280' };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>💬 FAQ 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onNavigateToList}
            style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >🏠 대시보드</button>
          <button
            onClick={openCreate}
            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >+ FAQ 등록</button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterCat('')}
          style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid #d1d5db', background: filterCat === '' ? '#4f46e5' : '#fff', color: filterCat === '' ? '#fff' : '#374151', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
        >전체 ({faqs.length})</button>
        {CATEGORIES.map(cat => {
          const cnt = faqs.filter(f => f.category === cat).length;
          if (cnt === 0) return null;
          const color = catColor[cat] || '#6b7280';
          return (
            <button key={cat}
              onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
              style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${color}`, background: filterCat === cat ? color : '#fff', color: filterCat === cat ? '#fff' : color, cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}
            >{cat} ({cnt})</button>
          );
        })}
      </div>

      {/* 목록 */}
      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center' }}>불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: 60 }}>
          등록된 FAQ가 없습니다. <br />
          <span style={{ fontSize: '0.85rem' }}>우측 상단 "+ FAQ 등록" 버튼으로 추가하세요.</span>
        </p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: catColor[cat] || '#6b7280', display: 'inline-block' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#374151', fontWeight: 700 }}>{cat}</h3>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{items.length}개</span>
            </div>
            {items.map(faq => (
              <div key={faq.faqId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: '#111827' }}>
                      Q. {faq.question}
                    </div>
                    <div style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>
                      A. {faq.answer}
                    </div>
                    {faq.keywords && (
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        🔑 키워드: {faq.keywords}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(faq)}
                      style={{ padding: '4px 10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem' }}
                    >수정</button>
                    <button
                      onClick={() => handleDelete(faq.faqId)}
                      style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem' }}
                    >삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* 등록/수정 모달 */}
      {showForm && (
        <div
          onClick={closeForm}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 28, width: 'min(580px,95vw)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>
              {editItem ? '✏️ FAQ 수정' : '➕ FAQ 등록'}
            </h3>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>카테고리</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={sel}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>질문 <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="예: 연차는 몇 일인가요?" style={inp} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                키워드 <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.78rem' }}>(콤마로 구분 — 챗봇 매칭에 사용)</span>
              </label>
              <input type="text" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="예: 연차,휴가,연차일수,휴가일수" style={inp} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>답변 <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="사원에게 보여줄 답변을 입력하세요."
                rows={5}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeForm} style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>취소</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 22px', background: saving ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              >{saving ? '저장 중...' : (editItem ? '수정 저장' : '등록')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaqManagePage;
