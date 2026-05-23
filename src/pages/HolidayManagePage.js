import React, { useState, useEffect, useCallback } from 'react';
import { fetchHolidays, createHoliday, deleteHoliday } from '../api/holidayApi';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// 날짜 "YYYY-MM-DD" → "M/D (요일)"
const fmtDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth()+1}/${d.getDate()} (${days[d.getDay()]})`;
};

function HolidayManagePage({ onNavigateToList }) {
  const [year,    setYear]    = useState(CURRENT_YEAR);
  const [holidays, setHolidays] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ holidayDate: '', holidayName: '' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchHolidays(year)
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // 월별 그룹핑
  const grouped = holidays.reduce((acc, h) => {
    const mo = parseInt(h.holidayDate.split('-')[1], 10);
    if (!acc[mo]) acc[mo] = [];
    acc[mo].push(h);
    return acc;
  }, {});

  const handleSave = async () => {
    if (!form.holidayDate) { setError('날짜를 선택해주세요.'); return; }
    if (!form.holidayName.trim()) { setError('공휴일 이름을 입력해주세요.'); return; }
    setSaving(true); setError('');
    try {
      const res = await createHoliday(form);
      if (!res.ok) throw new Error('등록 실패');
      setShowForm(false);
      setForm({ holidayDate: '', holidayName: '' });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const res = await deleteHoliday(id);
    if (res.ok) load(); else alert('삭제 실패');
  };

  const inp = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📅 공휴일 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNavigateToList}
            style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            🏠 대시보드
          </button>
          <button onClick={() => { setShowForm(true); setError(''); }}
            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            + 공휴일 등록
          </button>
        </div>
      </div>

      {/* 연도 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {YEARS.map(y => (
          <button key={y} onClick={() => setYear(y)}
            style={{ padding: '7px 20px', borderRadius: 20, border: `1px solid ${year === y ? '#4f46e5' : '#d1d5db'}`,
              background: year === y ? '#4f46e5' : '#fff', color: year === y ? '#fff' : '#374151',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
            {y}년
          </button>
        ))}
        <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.85rem', alignSelf: 'center' }}>
          총 {holidays.length}건
        </span>
      </div>

      {/* 월별 목록 */}
      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center' }}>불러오는 중...</p>
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
          <p style={{ marginBottom: 4 }}>등록된 공휴일이 없습니다.</p>
          <p style={{ fontSize: '0.85rem' }}>"+ 공휴일 등록" 버튼으로 추가하세요.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {MONTHS.map((label, idx) => {
            const mo = idx + 1;
            const items = grouped[mo] || [];
            return (
              <div key={mo} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {/* 월 헤더 */}
                <div style={{ background: items.length > 0 ? '#eef2ff' : '#f9fafb', padding: '10px 16px',
                  borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: items.length > 0 ? '#4f46e5' : '#9ca3af', fontSize: '0.95rem' }}>
                    {year}년 {label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{items.length}건</span>
                </div>
                {/* 공휴일 목록 */}
                <div style={{ padding: items.length === 0 ? '14px 16px' : '8px 0' }}>
                  {items.length === 0 ? (
                    <span style={{ color: '#d1d5db', fontSize: '0.82rem' }}>공휴일 없음</span>
                  ) : (
                    items.map(h => (
                      <div key={h.holidayId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.85rem', marginRight: 8 }}>
                            {fmtDate(h.holidayDate)}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#374151' }}>{h.holidayName}</span>
                        </div>
                        <button onClick={() => handleDelete(h.holidayId)}
                          style={{ padding: '3px 8px', background: '#fee2e2', color: '#ef4444', border: 'none',
                            borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 등록 모달 */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 28, width: 'min(420px,95vw)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem' }}>📅 공휴일 등록</h3>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                날짜 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="date" value={form.holidayDate}
                onChange={e => setForm(f => ({ ...f, holidayDate: e.target.value }))}
                style={inp} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                공휴일 이름 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="text" value={form.holidayName} placeholder="예: 어린이날"
                onChange={e => setForm(f => ({ ...f, holidayName: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={inp} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', background: saving ? '#a5b4fc' : '#4f46e5', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                {saving ? '저장 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HolidayManagePage;
