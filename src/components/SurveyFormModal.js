import React, { useState } from 'react';
import { createSurvey } from '../api/surveyApi';

const QUESTION_TYPES = [
  { value: 'SINGLE', label: '단일 선택' },
  { value: 'MULTI',  label: '복수 선택' },
  { value: 'TEXT',   label: '주관식' },
];

const emptyQuestion = () => ({
  questionText: '',
  questionType: 'SINGLE',
  options: [{ optionText: '' }, { optionText: '' }],
});

const SurveyFormModal = ({ onClose, onSaved }) => {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [questions,   setQuestions]   = useState([emptyQuestion()]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const addQuestion = () => setQuestions([...questions, emptyQuestion()]);

  const removeQuestion = (qi) =>
    setQuestions(questions.filter((_, i) => i !== qi));

  const updateQuestion = (qi, field, value) => {
    const updated = [...questions];
    updated[qi] = { ...updated[qi], [field]: value };
    if (field === 'questionType' && value === 'TEXT') {
      updated[qi].options = [];
    } else if (field === 'questionType' && updated[qi].options.length === 0) {
      updated[qi].options = [{ optionText: '' }, { optionText: '' }];
    }
    setQuestions(updated);
  };

  const addOption = (qi) => {
    const updated = [...questions];
    updated[qi].options = [...updated[qi].options, { optionText: '' }];
    setQuestions(updated);
  };

  const removeOption = (qi, oi) => {
    const updated = [...questions];
    updated[qi].options = updated[qi].options.filter((_, i) => i !== oi);
    setQuestions(updated);
  };

  const updateOption = (qi, oi, value) => {
    const updated = [...questions];
    updated[qi].options[oi].optionText = value;
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (questions.some(q => !q.questionText.trim())) { setError('모든 문항의 내용을 입력해주세요.'); return; }
    if (questions.some(q => q.questionType !== 'TEXT' && q.options.some(o => !o.optionText.trim()))) {
      setError('모든 선택지 내용을 입력해주세요.'); return;
    }

    setSaving(true); setError('');
    try {
      const res = await createSurvey({ title, description, endDate: endDate || null, questions });
      if (res.ok) { onSaved(); }
      else { const d = await res.json(); setError(d.error || '등록 실패'); }
    } catch { setError('서버 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      zIndex: 1000, overflowY: 'auto', padding: '40px 16px'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 640 }}>
        <h3 style={{ margin: '0 0 24px' }}>📋 설문 작성</h3>

        {error && <p style={{ color: '#ef4444', marginBottom: 12 }}>{error}</p>}

        {/* 기본 정보 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>제목 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="설문 제목을 입력하세요"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>설명</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="설문 설명 (선택)"
            rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>마감일</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6 }} />
        </div>

        {/* 문항 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, qi) => (
            <div key={qi} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>문항 {qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>
                    삭제
                  </button>
                )}
              </div>

              <input value={q.questionText} onChange={e => updateQuestion(qi, 'questionText', e.target.value)}
                placeholder="질문 내용을 입력하세요"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 10, boxSizing: 'border-box' }} />

              <select value={q.questionType} onChange={e => updateQuestion(qi, 'questionType', e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 10 }}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {/* 선택지 */}
              {q.questionType !== 'TEXT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map((o, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={o.optionText} onChange={e => updateOption(qi, oi, e.target.value)}
                        placeholder={`선택지 ${oi + 1}`}
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6 }} />
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(qi, oi)}
                          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOption(qi)}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #d1d5db',
                      borderRadius: 6, padding: '5px 14px', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>
                    + 선택지 추가
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addQuestion}
          style={{ width: '100%', marginTop: 12, padding: '10px', border: '2px dashed #d1d5db',
            borderRadius: 8, background: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.95rem' }}>
          + 문항 추가
        </button>

        {/* 하단 버튼 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            취소
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '9px 20px', background: saving ? '#a5b4fc' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {saving ? '저장 중...' : '설문 등록'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyFormModal;
