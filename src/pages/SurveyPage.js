import React, { useEffect, useState } from 'react';
import { fetchSurveys, closeSurvey, deleteSurvey } from '../api/surveyApi';
import SurveyFormModal from '../components/SurveyFormModal';
import SurveyAnswerModal from '../components/SurveyAnswerModal';
import SurveyResultModal from '../components/SurveyResultModal';
import '../styles/Button.css';

const SurveyPage = ({ isAdmin, onNavigateToList }) => {
  const [surveys, setSurveys]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [answerSurvey, setAnswerSurvey]   = useState(null);
  const [resultSurvey, setResultSurvey]   = useState(null);

  const load = () => {
    setLoading(true);
    fetchSurveys()
      .then(setSurveys)
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClose = async (surveyId) => {
    if (!window.confirm('설문을 마감하시겠습니까?')) return;
    try {
      const res = await closeSurvey(surveyId);
      if (!res.ok) {
        const body = await res.text();
        alert(`마감 실패 (${res.status}): ${body || '권한이 없거나 오류가 발생했습니다.'}`);
        return;
      }
      load();
    } catch (err) {
      alert('마감 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDelete = async (surveyId) => {
    if (!window.confirm('설문을 삭제하시겠습니까?')) return;
    try {
      const res = await deleteSurvey(surveyId);
      if (!res.ok) {
        const body = await res.text();
        alert(`삭제 실패 (${res.status}): ${body || '권한이 없거나 오류가 발생했습니다.'}`);
        return;
      }
      load();
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>📋 설문조사</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>총 {surveys.length}개</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-gray btn-lg" onClick={onNavigateToList}>🏠 대시보드</button>
          {isAdmin && (
            <button className="btn btn-blue btn-lg" onClick={() => setShowForm(true)}>+ 설문 작성</button>
          )}
        </div>
      </div>

      {/* 설문 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 60 }}>불러오는 중...</div>
      ) : surveys.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 60 }}>등록된 설문이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {surveys.map(survey => (
            <div key={survey.surveyId} style={{
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    background: survey.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                    color: survey.status === 'ACTIVE' ? '#16a34a' : '#6b7280',
                    fontSize: '0.75rem', fontWeight: 600,
                    padding: '2px 10px', borderRadius: 20
                  }}>
                    {survey.status === 'ACTIVE' ? '진행중' : '마감'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{survey.title}</span>
                </div>
                {survey.description && (
                  <p style={{ margin: '0 0 6px', color: '#6b7280', fontSize: '0.88rem' }}>{survey.description}</p>
                )}
                <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                  {survey.endDate && `마감일: ${survey.endDate} · `}
                  응답 {survey.responseCount}명
                </div>
              </div>

              {/* 버튼 영역 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                {isAdmin ? (
                  <>
                    <button className="btn btn-blue" onClick={() => setResultSurvey(survey.surveyId)}>
                      결과 보기
                    </button>
                    {survey.status === 'ACTIVE' && (
                      <button className="btn btn-gray" onClick={() => handleClose(survey.surveyId)}>
                        마감
                      </button>
                    )}
                    <button className="btn" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                      onClick={() => handleDelete(survey.surveyId)}>
                      삭제
                    </button>
                  </>
                ) : (
                  // 사원: 응답 여부에 따라 버튼 다름 (responseCount == -1이면 이미 응답)
                  survey.responseCount === -1 ? (
                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>✅ 응답 완료</span>
                  ) : survey.status === 'ACTIVE' ? (
                    <button className="btn btn-blue" onClick={() => setAnswerSurvey(survey.surveyId)}>
                      응답하기
                    </button>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>마감된 설문</span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 설문 작성 모달 */}
      {showForm && (
        <SurveyFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {/* 응답 모달 */}
      {answerSurvey && (
        <SurveyAnswerModal
          surveyId={answerSurvey}
          onClose={() => setAnswerSurvey(null)}
          onSaved={() => { setAnswerSurvey(null); load(); }}
        />
      )}

      {/* 결과 모달 */}
      {resultSurvey && (
        <SurveyResultModal
          surveyId={resultSurvey}
          onClose={() => setResultSurvey(null)}
        />
      )}
    </div>
  );
};

export default SurveyPage;
