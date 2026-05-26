import React, { useCallback, useEffect, useState } from 'react';
import EmpFormModal from '../components/EmpFormModal';
import CertificateModal from '../components/CertificateModal';
import SalarySlipModal from '../components/SalarySlipModal';
import { fetchEmpById, updateEmp, uploadPhoto } from '../api/empApi';
import { getKakaoAuthUrl } from '../api/noticeApi';
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

  const load = useCallback(() => {
    setLoading(true);
    fetchEmpById(empno)
      .then(setEmp)
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  }, [empno]);

  useEffect(() => { load(); }, [load]);

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
