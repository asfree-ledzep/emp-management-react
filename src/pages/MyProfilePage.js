import React, { useCallback, useEffect, useState } from 'react';
import EmpFormModal from '../components/EmpFormModal';
import CertificateModal from '../components/CertificateModal';
import SalarySlipModal from '../components/SalarySlipModal';
import { fetchEmpById, updateEmp, uploadPhoto } from '../api/empApi';
import { getKakaoAuthUrl } from '../api/noticeApi';
import { authFetch } from '../api/apiClient';
import DustWidget from '../components/DustWidget';
import '../styles/MyProfilePage.css';
import '../styles/Button.css';

const formatDate = (val) => {
  if (!val) return '-';
  if (Array.isArray(val)) {
    const [y, m, d] = val;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(val).slice(0, 10);
};

const formatMoney = (val) =>
  val != null ? val.toLocaleString('ko-KR') + ' 원' : '-';

const calcYearsOfService = (hiredate) => {
  if (!hiredate) return null;
  let start;
  if (Array.isArray(hiredate)) {
    const [y, m, d] = hiredate;
    start = new Date(y, m - 1, d);
  } else {
    start = new Date(String(hiredate).slice(0, 10));
  }
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  const years  = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0)  return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
};

// 사원 본인 프로필 페이지
// props:
//   empno - 로그인된 사원 번호
const MyProfilePage = ({ empno, onNavigateToSurvey, onNavigateToExpense, onNavigateToNotice, onNavigateToBoard }) => {
  const [emp,      setEmp]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showCert, setShowCert] = useState(false);  // 재직증명서
  const [showSlip, setShowSlip] = useState(false);  // 급여명세서
  const [weather,  setWeather]  = useState(null);   // 날씨

  const load = useCallback(() => {
    setLoading(true);
    fetchEmpById(empno)
      .then(setEmp)
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  }, [empno]);

  useEffect(() => { load(); }, [load]);

  // 날씨 조회
  useEffect(() => {
    authFetch('/api/weather/today?nx=60&ny=127')
      .then(r => r.json())
      .then(data => { if (!data.error) setWeather(data); })
      .catch(() => {});
  }, []);

  const handleSave = async (formData) => {
    const { _photoFile, ...empData } = formData;
    setSaving(true);
    try {
      await updateEmp(empData.empno, empData);
      if (_photoFile) await uploadPhoto(empData.empno, _photoFile);
      setEditing(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 80, color: '#6b7280' }}>불러오는 중...</div>;
  }

  if (!emp) {
    return <div style={{ textAlign: 'center', marginTop: 80, color: '#ef4444' }}>사원 정보를 불러오지 못했습니다.</div>;
  }

  const yearsOfService = calcYearsOfService(emp.hiredate);

  return (
    <div className="my-profile-page">
      <div className="my-profile-header">
        <h1>내 프로필</h1>
      </div>

      {/* ── 날씨 위젯 ── */}
      {weather && (
        <div style={{ marginBottom: 16 }}>

          {/* 재택 추천 배너 */}
          {weather.wfh && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: 12, padding: '11px 18px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 2px 12px rgba(245,158,11,0.18)',
            }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🏠</span>
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.92rem' }}>
                  ☔ 오늘은 재택근무를 추천합니다!
                </div>
                <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: 2 }}>
                  {weather.wfhReasons?.join(' · ')} 로 인한 악천후
                </div>
              </div>
            </div>
          )}

          {/* 날씨 카드 */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
            border: '1.5px solid #bfdbfe',
            borderRadius: 12, padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '2.2rem', lineHeight: 1, flexShrink: 0 }}>{weather.icon}</span>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                {weather.tmp}°C
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                {weather.skyText}{weather.pty > 0 ? ` · ${weather.ptyText}` : ''}
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: '#c7d2fe', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', flex: 1 }}>
              {[
                { label: '강수확률', value: `${weather.maxPop}%`, color: '#2563eb' },
                { label: '습도',     value: `${weather.reh}%`,    color: '#0891b2' },
                { label: '풍속',     value: `${weather.wsd}m/s`,  color: '#0f766e' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center', minWidth: 48 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right', flexShrink: 0 }}>
              📡 기상청 단기예보
            </div>
          </div>
        </div>
      )}

      {/* ── 미세먼지 위젯 ── */}
      <DustWidget darkMode={false} compact={true} />

      <div className="my-profile-card">
        {/* 상단 배너: 사진 + 이름 */}
        <div className="my-profile-banner">
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt="프로필" className="my-profile-avatar" />
          ) : (
            <div className="my-profile-avatar-placeholder">👤</div>
          )}
          <div className="my-profile-name">{emp.ename ?? '-'}</div>
          <div className="my-profile-job">{emp.job ?? ''}</div>
        </div>

        {/* 상세 정보 */}
        <div className="my-profile-info">
          <div className="my-profile-row">
            <span className="my-profile-row-label">사번</span>
            <span className="my-profile-row-value">{emp.empno}</span>
          </div>
          <div className="my-profile-row">
            <span className="my-profile-row-label">부서</span>
            <span className="my-profile-row-value">{emp.deptno ?? '-'}</span>
          </div>
          <div className="my-profile-row">
            <span className="my-profile-row-label">상사 사번</span>
            <span className="my-profile-row-value">{emp.mgr ?? '-'}</span>
          </div>
          <div className="my-profile-row">
            <span className="my-profile-row-label">입사일</span>
            <span className="my-profile-row-value">
              {formatDate(emp.hiredate)}
              {yearsOfService && (
                <span className="tenure-badge">{yearsOfService}</span>
              )}
            </span>
          </div>
          <div className="my-profile-row">
            <span className="my-profile-row-label">급여</span>
            <span className="my-profile-row-value">{formatMoney(emp.sal)}</span>
          </div>
          <div className="my-profile-row">
            <span className="my-profile-row-label">커미션</span>
            <span className="my-profile-row-value">{formatMoney(emp.comm)}</span>
          </div>
        </div>

        {/* 하단 버튼 — 3×2 그리드 */}
        <div className="my-profile-footer">
          <button className="btn btn-blue"  onClick={() => setEditing(true)}>✏️ 내 정보 수정</button>
          <button className="btn btn-gray"  onClick={onNavigateToSurvey}>📋 설문조사</button>
          <button className="btn btn-blue"  onClick={onNavigateToExpense}>💰 지출 관리</button>
          <button className="btn btn-gray"  onClick={onNavigateToNotice}>📢 공지사항</button>
          <button className="btn btn-gray"  onClick={() => setShowCert(true)}>📄 재직증명서</button>
          <button className="btn btn-green" onClick={() => setShowSlip(true)}>💵 급여명세서</button>
          <button className="btn btn-blue"  onClick={onNavigateToBoard}>📌 게시판</button>
          <button
            className="btn btn-kakao"
            onClick={() => getKakaoAuthUrl().then(data => { window.location.href = data.url; })}
          >
            🔗 카카오 연동
          </button>
        </div>
      </div>

      {/* 수정 모달 */}
      {editing && (
        <EmpFormModal
          mode="edit"
          emp={emp}
          onSave={handleSave}
          onClose={() => setEditing(false)}
          saving={saving}
          isAdmin={false}
        />
      )}

      {/* 재직증명서 모달 */}
      {showCert && (
        <CertificateModal emp={emp} onClose={() => setShowCert(false)} />
      )}

      {/* 급여명세서 모달 */}
      {showSlip && (
        <SalarySlipModal emp={emp} onClose={() => setShowSlip(false)} />
      )}
    </div>
  );
};

export default MyProfilePage;
