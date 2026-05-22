import React, { useEffect, useState } from 'react';
import { fetchSurvey, fetchResults, fetchTextAnswers } from '../api/surveyApi';

const SurveyResultModal = ({ surveyId, onClose }) => {
  const [survey,  setSurvey]  = useState(null);
  const [results, setResults] = useState([]);
  const [textAnswersMap, setTextAnswersMap] = useState({});

  useEffect(() => {
    Promise.all([fetchSurvey(surveyId), fetchResults(surveyId)])
      .then(([s, r]) => {
        setSurvey(s);
        setResults(r);

        // 주관식 문항 응답 로드
        const textQuestions = s.questions.filter(q => q.questionType === 'TEXT');
        Promise.all(textQuestions.map(q =>
          fetchTextAnswers(surveyId, q.questionId).then(answers => ({ [q.questionId]: answers }))
        )).then(maps => {
          setTextAnswersMap(Object.assign({}, ...maps));
        });
      });
  }, [surveyId]);

  if (!survey) return null;

  // 문항별 결과 그룹핑
  const questionMap = {};
  results.forEach(r => {
    if (!questionMap[r.questionId]) {
      questionMap[r.questionId] = { questionText: r.questionText, questionType: r.questionType, options: [] };
    }
    if (r.optionId) {
      questionMap[r.questionId].options.push({ optionId: r.optionId, optionText: r.optionText, count: Number(r.answerCount) });
    }
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      zIndex: 1000, overflowY: 'auto', padding: '40px 16px'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>📊 {survey.title} - 결과</h3>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>총 응답 {survey.responseCount}명</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {survey.questions.map((q, i) => {
            const qResult = questionMap[q.questionId];
            const total = qResult ? qResult.options.reduce((s, o) => s + o.count, 0) : 0;

            return (
              <div key={q.questionId} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: i > 0 ? 20 : 0 }}>
                <p style={{ fontWeight: 600, margin: '0 0 14px' }}>
                  {i + 1}. {q.questionText}
                </p>

                {q.questionType === 'TEXT' ? (
                  // 주관식 응답 목록
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(textAnswersMap[q.questionId] || []).length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>응답 없음</p>
                    ) : (
                      (textAnswersMap[q.questionId] || []).map((text, idx) => (
                        <div key={idx} style={{
                          background: '#f9fafb', borderRadius: 6, padding: '8px 12px',
                          fontSize: '0.9rem', color: '#374151'
                        }}>
                          {text}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // 객관식 막대 차트
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {qResult && qResult.options.map(o => {
                      const pct = total > 0 ? Math.round((o.count / total) * 100) : 0;
                      return (
                        <div key={o.optionId}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9rem' }}>
                            <span>{o.optionText}</span>
                            <span style={{ color: '#6b7280' }}>{o.count}명 ({pct}%)</span>
                          </div>
                          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%',
                              background: '#4f46e5', borderRadius: 4,
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'right', marginTop: 28 }}>
          <button onClick={onClose}
            style={{ padding: '9px 24px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyResultModal;
