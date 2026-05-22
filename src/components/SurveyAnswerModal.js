import React, { useEffect, useState } from 'react';
import { fetchSurvey, submitResponse } from '../api/surveyApi';

const SurveyAnswerModal = ({ surveyId, onClose, onSaved }) => {
  const [survey,  setSurvey]  = useState(null);
  const [answers, setAnswers] = useState({});  // questionId → optionId[] or string
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchSurvey(surveyId).then(setSurvey);
  }, [surveyId]);

  const handleSingle = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: [optionId] }));
  };

  const handleMulti = (questionId, optionId, checked) => {
    setAnswers(prev => {
      const cur = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: checked ? [...cur, optionId] : cur.filter(id => id !== optionId)
      };
    });
  };

  const handleText = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // 미응답 문항 체크
    const unanswered = survey.questions.find(q => {
      const a = answers[q.questionId];
      if (q.questionType === 'TEXT') return !a || !a.trim();
      return !a || a.length === 0;
    });
    if (unanswered) { setError('모든 문항에 응답해주세요.'); return; }

    setSaving(true); setError('');
    try {
      const payload = survey.questions.flatMap(q => {
        const a = answers[q.questionId];
        if (q.questionType === 'TEXT') {
          return [{ questionId: q.questionId, textValue: a }];
        }
        return a.map(optionId => ({ questionId: q.questionId, optionId }));
      });

      const res = await submitResponse(surveyId, payload);
      if (res.ok) { onSaved(); }
      else { const d = await res.json(); setError(d.error || '제출 실패'); }
    } catch { setError('서버 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  if (!survey) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      zIndex: 1000, overflowY: 'auto', padding: '40px 16px'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 600 }}>
        <h3 style={{ margin: '0 0 6px' }}>{survey.title}</h3>
        {survey.description && <p style={{ color: '#6b7280', margin: '0 0 24px' }}>{survey.description}</p>}

        {error && <p style={{ color: '#ef4444', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {survey.questions.map((q, i) => (
            <div key={q.questionId} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: i > 0 ? 16 : 0 }}>
              <p style={{ fontWeight: 600, margin: '0 0 10px' }}>
                {i + 1}. {q.questionText}
                <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8rem', marginLeft: 8 }}>
                  {q.questionType === 'SINGLE' ? '(단일 선택)' : q.questionType === 'MULTI' ? '(복수 선택)' : '(주관식)'}
                </span>
              </p>

              {q.questionType === 'TEXT' ? (
                <textarea
                  value={answers[q.questionId] || ''}
                  onChange={e => handleText(q.questionId, e.target.value)}
                  placeholder="답변을 입력하세요"
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map(o => (
                    <label key={o.optionId} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input
                        type={q.questionType === 'SINGLE' ? 'radio' : 'checkbox'}
                        name={`q_${q.questionId}`}
                        checked={q.questionType === 'SINGLE'
                          ? (answers[q.questionId] || [])[0] === o.optionId
                          : (answers[q.questionId] || []).includes(o.optionId)}
                        onChange={e => {
                          if (q.questionType === 'SINGLE') handleSingle(q.questionId, o.optionId);
                          else handleMulti(q.questionId, o.optionId, e.target.checked);
                        }}
                      />
                      {o.optionText}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            취소
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '9px 20px', background: saving ? '#a5b4fc' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {saving ? '제출 중...' : '응답 제출'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyAnswerModal;
