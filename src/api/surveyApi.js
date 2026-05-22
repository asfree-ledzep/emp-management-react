import { authFetch } from './apiClient';

const BASE = '/api/surveys';

// 설문 목록
export const fetchSurveys = () =>
  authFetch(BASE).then(r => r.json());

// 설문 상세
export const fetchSurvey = (surveyId) =>
  authFetch(`${BASE}/${surveyId}`).then(r => r.json());

// 설문 등록 (관리자)
export const createSurvey = (survey) =>
  authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(survey),
  });

// 설문 마감 (관리자)
export const closeSurvey = (surveyId) =>
  authFetch(`${BASE}/${surveyId}/close`, { method: 'PATCH' });

// 설문 삭제 (관리자)
export const deleteSurvey = (surveyId) =>
  authFetch(`${BASE}/${surveyId}`, { method: 'DELETE' });

// 응답 제출 (사원)
export const submitResponse = (surveyId, answers) =>
  authFetch(`${BASE}/${surveyId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  });

// 응답 여부 확인
export const checkResponded = (surveyId) =>
  authFetch(`${BASE}/${surveyId}/responded`).then(r => r.json());

// 설문 결과 (관리자)
export const fetchResults = (surveyId) =>
  authFetch(`${BASE}/${surveyId}/results`).then(r => r.json());

// 주관식 응답 목록 (관리자)
export const fetchTextAnswers = (surveyId, questionId) =>
  authFetch(`${BASE}/${surveyId}/questions/${questionId}/text-answers`).then(r => r.json());
