import React, { useState, useEffect } from 'react';
import { parseReceipt, createExpense, fetchMyExpenses } from '../api/expenseApi';

const CATEGORIES = ['식비', '교통비', '숙박비', '업무용품', '접대비', '기타'];

const fmt = (v) => v != null ? Number(v).toLocaleString('ko-KR') + ' 원' : '-';

const ReceiptUploadModal = ({ onClose }) => {
  const [tab, setTab] = useState('upload'); // 'upload' | 'list'

  // 업로드 탭 상태
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [parsing, setParsing]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm] = useState({
    receiptUrl:  '',
    amount:      '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category:    '기타',
    description: '',
    ocrRaw:      '',
  });

  // 내역 탭 상태
  const [myList, setMyList]     = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (tab === 'list') loadMyList();
  }, [tab]);

  const loadMyList = () => {
    setListLoading(true);
    fetchMyExpenses()
      .then(setMyList)
      .catch(() => {})
      .finally(() => setListLoading(false));
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setForm(prev => ({ ...prev, receiptUrl: '', amount: '', ocrRaw: '' }));
  };

  const handleParse = async () => {
    if (!file) { alert('영수증 이미지를 선택해주세요.'); return; }
    setParsing(true);
    try {
      const result = await parseReceipt(file);
      setForm(prev => ({
        ...prev,
        receiptUrl:  result.receiptUrl  || '',
        amount:      result.amount      != null ? String(result.amount) : '',
        expenseDate: result.expenseDate || prev.expenseDate,
        ocrRaw:      result.ocrRaw      || '',
      }));
      alert('OCR 분석 완료! 금액과 날짜를 확인·수정 후 제출하세요.');
    } catch (e) {
      alert('OCR 분석 실패: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.receiptUrl) { alert('먼저 OCR 분석을 실행해주세요.'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { alert('금액을 올바르게 입력해주세요.'); return; }
    if (!form.expenseDate) { alert('날짜를 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const res = await createExpense({
        receiptUrl:  form.receiptUrl,
        amount:      Number(form.amount),
        expenseDate: form.expenseDate,
        category:    form.category,
        description: form.description,
        ocrRaw:      form.ocrRaw,
      });
      if (!res.ok) { alert('등록 실패'); return; }
      alert('지출이 등록되었습니다.');
      setFile(null); setPreview(null);
      setForm({ receiptUrl:'', amount:'', expenseDate: new Date().toISOString().slice(0,10), category:'기타', description:'', ocrRaw:'' });
    } catch (e) {
      alert('오류: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'flex-start', zIndex:1000, overflowY:'auto', padding:'40px 16px' };
  const card    = { background:'#fff', borderRadius:12, padding:28, width:'100%', maxWidth:560 };
  const tabBtn  = (active) => ({ padding:'8px 20px', border:'none', borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent', background:'none', cursor:'pointer', fontWeight: active ? 700 : 400, color: active ? '#4f46e5' : '#6b7280', fontSize:'0.95rem' });
  const inputStyle = { width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:'0.9rem', boxSizing:'border-box' };
  const label  = { display:'block', fontSize:'0.85rem', color:'#374151', marginBottom:4, fontWeight:500 };
  const btnPrimary = { padding:'10px 24px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 };
  const btnGray    = { padding:'10px 24px', background:'#6b7280', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' };

  return (
    <div style={overlay}>
      <div style={card}>
        {/* 헤더 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>💰 지출 관리</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
        </div>

        {/* 탭 */}
        <div style={{ borderBottom:'1px solid #e5e7eb', marginBottom:20, display:'flex' }}>
          <button style={tabBtn(tab==='upload')} onClick={() => setTab('upload')}>📷 영수증 등록</button>
          <button style={tabBtn(tab==='list')}   onClick={() => setTab('list')}>📋 내 지출 내역</button>
        </div>

        {/* ── 업로드 탭 ── */}
        {tab === 'upload' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* 이미지 선택 */}
            <div>
              <label style={label}>영수증 사진</label>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize:'0.9rem' }} />
            </div>

            {/* 미리보기 */}
            {preview && (
              <div style={{ textAlign:'center' }}>
                <img src={preview} alt="영수증 미리보기"
                  style={{ maxWidth:'100%', maxHeight:220, borderRadius:8, border:'1px solid #e5e7eb', objectFit:'contain' }} />
              </div>
            )}

            {/* OCR 분석 버튼 */}
            <button onClick={handleParse} disabled={!file || parsing}
              style={{ ...btnPrimary, opacity: (!file || parsing) ? 0.6 : 1 }}>
              {parsing ? '🔍 분석 중...' : '🔍 OCR 자동 분석'}
            </button>

            {/* 금액 */}
            <div>
              <label style={label}>금액 (원)</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                placeholder="예: 15000" style={inputStyle} />
            </div>

            {/* 날짜 */}
            <div>
              <label style={label}>지출 날짜</label>
              <input type="date" value={form.expenseDate} onChange={e => setForm(p => ({...p, expenseDate: e.target.value}))}
                style={inputStyle} />
            </div>

            {/* 카테고리 */}
            <div>
              <label style={label}>카테고리</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label style={label}>설명 (선택)</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                placeholder="예: 팀 회식, 택시비 등" style={inputStyle} />
            </div>

            {/* OCR 원문 */}
            {form.ocrRaw && (
              <details style={{ fontSize:'0.8rem', color:'#6b7280' }}>
                <summary style={{ cursor:'pointer' }}>OCR 원문 보기</summary>
                <pre style={{ whiteSpace:'pre-wrap', marginTop:6, background:'#f9fafb', padding:8, borderRadius:4, maxHeight:120, overflowY:'auto' }}>
                  {form.ocrRaw}
                </pre>
              </details>
            )}

            {/* 버튼 */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button onClick={onClose} style={btnGray}>취소</button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? '등록 중...' : '✅ 제출'}
              </button>
            </div>
          </div>
        )}

        {/* ── 내역 탭 ── */}
        {tab === 'list' && (
          <div>
            {listLoading ? (
              <p style={{ color:'#6b7280', textAlign:'center' }}>불러오는 중...</p>
            ) : myList.length === 0 ? (
              <p style={{ color:'#9ca3af', textAlign:'center' }}>등록된 지출 내역이 없습니다.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {myList.map(e => (
                  <div key={e.expenseId} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:12, display:'flex', gap:12, alignItems:'flex-start' }}>
                    {e.receiptUrl && (
                      <a href={e.receiptUrl} target="_blank" rel="noreferrer">
                        <img src={e.receiptUrl} alt="영수증" style={{ width:56, height:56, objectFit:'cover', borderRadius:6, border:'1px solid #e5e7eb', flexShrink:0 }} />
                      </a>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontWeight:600, color:'#111827' }}>{fmt(e.amount)}</span>
                        <span style={{
                          fontSize:'0.75rem', padding:'2px 8px', borderRadius:10,
                          background: e.status === 'CONFIRMED' ? '#d1fae5' : '#fef3c7',
                          color:      e.status === 'CONFIRMED' ? '#065f46' : '#92400e'
                        }}>
                          {e.status === 'CONFIRMED' ? '✅ 확인완료' : '⏳ 검토중'}
                        </span>
                      </div>
                      <div style={{ fontSize:'0.82rem', color:'#6b7280' }}>
                        {e.expenseDate} · {e.category}
                        {e.description && <span> · {e.description}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign:'right', marginTop:16 }}>
              <button onClick={onClose} style={btnGray}>닫기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptUploadModal;
