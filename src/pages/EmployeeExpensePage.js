import React, { useState, useEffect } from 'react';
import { parseReceipt, createExpense, fetchMyExpenses } from '../api/expenseApi';

const CATEGORIES = ['식비', '교통비', '숙박비', '업무용품', '접대비', '기타'];

const fmt = (v) => v != null ? Number(v).toLocaleString('ko-KR') + ' 원' : '-';

const EmployeeExpensePage = ({ onNavigateToList }) => {
  const [tab, setTab] = useState('upload'); // 'upload' | 'list'

  // ── 업로드 탭 ──
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [parsing, setParsing]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrDone, setOcrDone]       = useState(false);   // OCR 완료 여부
  const [form, setForm] = useState({
    receiptUrl:  '',
    amount:      '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category:    '기타',
    description: '',
    ocrRaw:      '',
  });

  // ── 내역 탭 ──
  const [myList, setMyList]         = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);

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
    setOcrDone(false);
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
      setOcrDone(true);
      const parsed = result.amount != null;
      if (!parsed) {
        alert('OCR 분석 완료!\n\n⚠️ 금액을 자동으로 찾지 못했습니다.\n아래 OCR 원문을 확인하고 금액을 직접 입력해주세요.');
      }
    } catch (e) {
      alert('OCR 분석 실패: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!ocrDone) { alert('먼저 OCR 분석을 실행해주세요.'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { alert('금액을 입력해주세요.'); return; }
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
      setFile(null);
      setPreview(null);
      setForm({
        receiptUrl:'', amount:'',
        expenseDate: new Date().toISOString().slice(0, 10),
        category:'기타', description:'', ocrRaw:'',
      });
      setTab('list');
    } catch (e) {
      if (e.message && e.message.includes('이미 제출된')) {
        alert('⚠️ 중복 영수증\n\n이미 제출된 영수증입니다.\n같은 영수증을 두 번 등록할 수 없습니다.');
      } else {
        alert('오류: ' + e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── 스타일 ──
  const tabBtn = (active) => ({
    padding: '9px 24px', border: 'none',
    borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    background: 'none', cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    color: active ? '#4f46e5' : '#6b7280',
    fontSize: '0.95rem',
  });
  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: '0.9rem', boxSizing: 'border-box',
  };
  const label = {
    display: 'block', fontSize: '0.85rem',
    color: '#374151', marginBottom: 4, fontWeight: 600,
  };
  const btnPrimary = {
    padding: '10px 24px', background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
  };
  const btnGray = {
    padding: '10px 24px', background: '#6b7280', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>💰 지출 관리</h2>
        <button onClick={onNavigateToList} style={btnGray}>← 내 프로필</button>
      </div>

      {/* 탭 */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 24, display: 'flex' }}>
        <button style={tabBtn(tab === 'upload')} onClick={() => setTab('upload')}>📷 영수증 등록</button>
        <button style={tabBtn(tab === 'list')}   onClick={() => setTab('list')}>📋 내 지출 내역</button>
      </div>

      {/* ════ 영수증 등록 탭 ════ */}
      {tab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 파일 선택 */}
          <div style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: 24, textAlign: 'center', background: '#fafafa' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧾</div>
            <div style={{ color: '#6b7280', marginBottom: 12, fontSize: '0.9rem' }}>영수증 사진을 선택하세요</div>
            <input
              type="file" accept="image/*"
              onChange={handleFileChange}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* 이미지 미리보기 */}
          {preview && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={preview} alt="영수증 미리보기"
                style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* OCR 분석 버튼 */}
          <button
            onClick={handleParse}
            disabled={!file || parsing}
            style={{ ...btnPrimary, background: '#7c3aed', opacity: (!file || parsing) ? 0.6 : 1 }}
          >
            {parsing ? '🔍 분석 중...' : '🔍 OCR 자동 분석 (금액·날짜 자동 추출)'}
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6' }} />

          {/* OCR 원문 — 분석 후 항상 표시 */}
          {ocrDone && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                📄 OCR 추출 원문 (참고용)
              </div>
              <pre style={{
                whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.78rem',
                color: '#374151', maxHeight: 150, overflowY: 'auto', lineHeight: 1.6,
              }}>
                {form.ocrRaw || '(텍스트 없음 — 이미지 품질을 확인하세요)'}
              </pre>
            </div>
          )}

          {/* 금액 */}
          <div>
            <label style={label}>
              금액 (원) *
              {ocrDone && form.amount && <span style={{ marginLeft: 6, fontSize:'0.75rem', color:'#059669', fontWeight:400 }}>✅ 자동 입력됨</span>}
              {ocrDone && !form.amount && <span style={{ marginLeft: 6, fontSize:'0.75rem', color:'#ef4444', fontWeight:400 }}>⚠️ 직접 입력 필요</span>}
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="예: 15000"
              style={{ ...inputStyle, borderColor: ocrDone && form.amount ? '#059669' : ocrDone && !form.amount ? '#ef4444' : '#d1d5db' }}
            />
          </div>

          {/* 날짜 */}
          <div>
            <label style={label}>
              지출 날짜 *
              {ocrDone && <span style={{ marginLeft: 6, fontSize:'0.75rem', color:'#059669', fontWeight:400 }}>✅ 자동 입력됨</span>}
            </label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))}
              style={{ ...inputStyle, borderColor: ocrDone ? '#059669' : '#d1d5db' }}
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label style={label}>카테고리</label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={inputStyle}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* 설명 */}
          <div>
            <label style={label}>설명 (선택)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="예: 팀 회식, 택시비 등"
              style={inputStyle}
            />
          </div>

          {/* OCR 원문 */}
          {form.ocrRaw && (
            <details style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              <summary style={{ cursor: 'pointer', userSelect: 'none' }}>📄 OCR 원문 보기</summary>
              <pre style={{
                whiteSpace: 'pre-wrap', marginTop: 6, background: '#f9fafb',
                padding: 10, borderRadius: 6, maxHeight: 140, overflowY: 'auto',
                fontSize: '0.78rem', lineHeight: 1.5,
              }}>
                {form.ocrRaw}
              </pre>
            </details>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1, marginTop: 4 }}
          >
            {submitting ? '등록 중...' : '✅ 지출 제출'}
          </button>

          {!form.receiptUrl && file && (
            <p style={{ color: '#f59e0b', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>
              ⚠️ OCR 분석 후 제출하거나, 금액·날짜를 직접 입력 후 분석 없이는 제출 불가합니다.
            </p>
          )}
        </div>
      )}

      {/* ════ 내 지출 내역 탭 ════ */}
      {tab === 'list' && (
        <div>
          {listLoading ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>불러오는 중...</p>
          ) : myList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧾</div>
              <p>등록된 지출 내역이 없습니다.</p>
              <button onClick={() => setTab('upload')} style={btnPrimary}>
                첫 영수증 등록하기
              </button>
            </div>
          ) : (
            <>
              {/* 합계 */}
              <div style={{
                background: '#eef2ff', borderRadius: 8, padding: '12px 16px',
                marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: '#4f46e5', fontWeight: 600 }}>총 {myList.length}건</span>
                <span style={{ color: '#4f46e5', fontWeight: 700, fontSize: '1.05rem' }}>
                  {fmt(myList.reduce((s, e) => s + (e.amount || 0), 0))}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myList.map(e => (
                  <div key={e.expenseId} style={{
                    border: '1px solid #e5e7eb', borderRadius: 10, padding: 14,
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: e.status === 'CONFIRMED' ? '#f0fdf4' : '#fff',
                  }}>
                    {/* 영수증 썸네일 */}
                    {e.receiptUrl ? (
                      <img
                        src={e.receiptUrl} alt="영수증"
                        onClick={() => setReceiptModal(e.receiptUrl)}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #e5e7eb', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.5rem' }}>🧾</div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{fmt(e.amount)}</span>
                        <span style={{
                          fontSize: '0.72rem', padding: '3px 9px', borderRadius: 10,
                          background: e.status === 'CONFIRMED' ? '#d1fae5' : '#fef3c7',
                          color: e.status === 'CONFIRMED' ? '#065f46' : '#92400e',
                          fontWeight: 600,
                        }}>
                          {e.status === 'CONFIRMED' ? '✅ 확인완료' : '⏳ 검토중'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.83rem', color: '#6b7280' }}>
                        📅 {e.expenseDate}
                        <span style={{ margin: '0 6px' }}>·</span>
                        🏷️ {e.category}
                        {e.description && <><span style={{ margin: '0 6px' }}>·</span>{e.description}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 영수증 전체보기 모달 */}
      {receiptModal && (
        <div
          onClick={() => setReceiptModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, cursor: 'pointer' }}
        >
          <img src={receiptModal} alt="영수증 전체보기"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
};

export default EmployeeExpensePage;
