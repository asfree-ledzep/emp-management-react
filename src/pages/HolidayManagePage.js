import React, { useState, useEffect, useCallback } from 'react';
import { fetchHolidays, createHoliday, deleteHoliday } from '../api/holidayApi';

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// "YYYY-MM-DD" → "M/D (요일)"
const fmtDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth()+1}/${d.getDate()} (${days[d.getDay()]})`;
};

function HolidayManagePage({ onNavigateToList }) {
  const [year,     setYear]     = useState(CURRENT_YEAR);
  const [holidays, setHolidays] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ holidayDate: '', holidayEndDate: '', holidayName: '' });
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

  const publicCount = holidays.filter(h => h.source === 'PUBLIC').length;
  const customCount = holidays.filter(h => h.source === 'CUSTOM').length;

  const handleSave = async () => {
    if (!form.holidayDate)        { setError('시작일을 선택해주세요.'); return; }
    if (!form.holidayEndDate)     { setError('종료일을 선택해주세요.'); return; }
    if (form.holidayEndDate < form.holidayDate) { setError('종료일은 시작일 이후여야 합니다.'); return; }
    if (!form.holidayName.trim()) { setError('공휴일 이름을 입력해주세요.'); return; }
    setSaving(true); setError('');
    try {
      const res = await createHoliday(form);
      if (!res.ok) throw new Error('등록 실패');
      setShowForm(false);
      setForm({ holidayDate: '', holidayEndDate: '', holidayName: '' });
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

  const inp = {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: '0.88rem', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📅 공휴일 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNavigateToList}
            style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            🏠 대시보드
          </button>
          <button onClick={() => { setShowForm(true); setError(''); }}
            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            + 직접 추가
          </button>
        </div>
      </div>

      {/* 연도 선택 + 범례 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              style={{ padding: '7px 20px', borderRadius: 20,
                border: `1px solid ${year === y ? '#4f46e5' : '#d1d5db'}`,
                background: year === y ? '#4f46e5' : '#fff',
                color: year === y ? '#fff' : '#374151',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
              {y}년
            </button>
          ))}
        </div>

        {/* 범례 + 건수 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 7px', fontWeight: 600, color: '#b91c1c' }}>공공</span>
            공공 API {publicCount}건
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 4, padding: '2px 7px', fontWeight: 600, color: '#6d28d9' }}>직접</span>
            직접 추가 {customCount}건
          </span>
        </div>
      </div>

      {/* 월별 그리드 */}
      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '60px 0' }}>
          공공 API에서 공휴일을 불러오는 중...
        </p>
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
          <p style={{ marginBottom: 4 }}>이 연도에 데이터가 없습니다.</p>
          <p style={{ fontSize: '0.85rem' }}>"+ 직접 추가" 버튼으로 관리자 공휴일을 등록하세요.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
          {MONTHS.map((label, idx) => {
            const mo = idx + 1;
            const items = grouped[mo] || [];
            const hasItems = items.length > 0;
            return (
              <div key={mo} style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 12, overflow: 'hidden',
              }}>
                {/* 월 헤더 */}
                <div style={{
                  background: hasItems ? '#eef2ff' : '#f9fafb',
                  padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: hasItems ? '#4f46e5' : '#9ca3af' }}>
                    {year}년 {label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{items.length}건</span>
                </div>

                {/* 공휴일 항목 */}
                <div style={{ padding: hasItems ? '6px 0' : '14px 16px' }}>
                  {!hasItems ? (
                    <span style={{ color: '#d1d5db', fontSize: '0.82rem' }}>공휴일 없음</span>
                  ) : (
                    items.map((h, i) => {
                      const isCustom = h.source === 'CUSTOM';
                      return (
                        <div key={h.holidayId ?? `pub-${i}`} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '7px 14px',
                          borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: isCustom ? '#faf5ff' : '#fff',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                            {/* 출처 뱃지 */}
                            <span style={{
                              flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                              padding: '1px 5px', borderRadius: 4,
                              background: isCustom ? '#ede9fe' : '#fee2e2',
                              color: isCustom ? '#6d28d9' : '#b91c1c',
                              border: `1px solid ${isCustom ? '#c4b5fd' : '#fca5a5'}`,
                            }}>
                              {isCustom ? '직접' : '공공'}
                            </span>
                            <div>
                              <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.84rem', marginRight: 5 }}>
                                {fmtDate(h.holidayDate)}
                                {h.holidayEndDate && h.holidayEndDate !== h.holidayDate &&
                                  ` ~ ${fmtDate(h.holidayEndDate)}`}
                              </span>
                              <span style={{ fontSize: '0.84rem', color: '#374151' }}>{h.holidayName}</span>
                            </div>
                          </div>

                          {/* 삭제 버튼: CUSTOM만 */}
                          {isCustom ? (
                            <button onClick={() => handleDelete(h.holidayId)}
                              style={{
                                flexShrink: 0, marginLeft: 8,
                                padding: '3px 8px', background: '#fee2e2', color: '#ef4444',
                                border: 'none', borderRadius: 4, cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 600,
                              }}>
                              삭제
                            </button>
                          ) : (
                            <span style={{ flexShrink: 0, marginLeft: 8, width: 42 }} />
                          )}
                        </div>
                      );
                    })
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 28, width: 'min(420px,95vw)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>📅 공휴일 직접 추가</h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#6b7280' }}>
              공공 API에 없는 날짜를 직접 등록합니다. (회사 창립일, 임시 공휴일 등)
            </p>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                  시작일 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="date" value={form.holidayDate}
                  onChange={e => setForm(f => ({
                    ...f,
                    holidayDate: e.target.value,
                    holidayEndDate: f.holidayEndDate || e.target.value,
                  }))}
                  style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                  종료일 <span style={{ color: '#ef4444' }}>*</span>
                  <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.72rem', marginLeft: 4 }}>
                    (단일=시작일과 같게)
                  </span>
                </label>
                <input type="date" value={form.holidayEndDate}
                  onChange={e => setForm(f => ({ ...f, holidayEndDate: e.target.value }))}
                  min={form.holidayDate}
                  style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: '0.85rem' }}>
                이름 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="text" value={form.holidayName}
                placeholder="예: 창립기념일, 임시 공휴일"
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
