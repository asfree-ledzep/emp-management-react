import React, { useState, useEffect, useRef } from 'react';
import SetPasswordModal from './SetPasswordModal';
import { fetchEmpAddr } from '../api/empApi';
import '../styles/Modal.css';
import '../styles/Button.css';

const KAKAO_APP_KEY = '663072c00684e797249abd24309c65e2';

// 날짜 배열 [year, month, day] 또는 문자열을 YYYY-MM-DD 형식으로 변환
const formatDate = (val) => {
  if (!val) return '-';
  if (Array.isArray(val)) {
    const [y, m, d] = val;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(val).slice(0, 10);
};

// 금액을 천 단위 구분자 + 원 단위로 표시
const formatMoney = (val) =>
  val != null ? val.toLocaleString('ko-KR') + ' 원' : '-';

// 입사일 기준 근속연수 계산
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

// 카카오 지도 SDK 로드 (services 라이브러리 포함)
const loadKakaoSdk = (callback) => {
  if (window.kakao?.maps?.services) {
    callback();
    return;
  }
  if (window.kakao?.maps) {
    // SDK는 있지만 services 미로드 → load() 콜백으로 처리
    window.kakao.maps.load(callback);
    return;
  }
  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(callback);
  document.head.appendChild(script);
};

// 사원 상세보기 모달
const EmpDetailModal = ({ emp, onClose, onEdit, isAdmin = false }) => {
  const [showSetPw, setShowSetPw] = useState(false);
  const [addr, setAddr] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!emp) return;
    fetchEmpAddr(emp.empno)
      .then(setAddr)
      .catch(() => setAddr(null));
  }, [emp]);

  // 주소가 로드된 후 지도 렌더링
  useEffect(() => {
    if (!addr?.address || !mapRef.current) return;

    loadKakaoSdk(() => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(addr.address, (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK) return;
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: coords,
          level: 4,
        });
        const marker = new window.kakao.maps.Marker({ position: coords });
        marker.setMap(map);

        // 주소 인포윈도우
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:13px;white-space:nowrap;">${addr.address}${addr.addrDetail ? ' ' + addr.addrDetail : ''}</div>`,
        });
        infowindow.open(map, marker);
      });
    });
  }, [addr]);

  if (!emp) return null;

  const yearsOfService = calcYearsOfService(emp.hiredate);
  const hasAddr = addr && (addr.zipcode || addr.address);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: hasAddr ? 560 : undefined }}
        >
          <div className="modal-header">
            <h2>사원 상세보기</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {emp.photoUrl && (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <img
                  src={emp.photoUrl}
                  alt="프로필"
                  style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                />
              </div>
            )}
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">사번</span>
                <span className="detail-value">{emp.empno}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">사원명</span>
                <span className="detail-value">{emp.ename ?? '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">직책</span>
                <span className="detail-value">{emp.job ?? '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">상사 사번</span>
                <span className="detail-value">{emp.mgr ?? '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">입사일</span>
                <span className="detail-value">
                  {formatDate(emp.hiredate)}
                  {yearsOfService && (
                    <span style={{
                      marginLeft: '8px',
                      background: '#eff6ff',
                      color: '#3b82f6',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: '1px solid #bfdbfe',
                    }}>
                      {yearsOfService}
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">급여</span>
                <span className="detail-value">{formatMoney(emp.sal)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">커미션</span>
                <span className="detail-value">{formatMoney(emp.comm)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">부서번호</span>
                <span className="detail-value">{emp.deptno ?? '-'}</span>
              </div>

              {hasAddr && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">주소</span>
                  <span className="detail-value">
                    {addr.zipcode && (
                      <span style={{
                        display: 'inline-block', marginRight: 6,
                        background: '#eff6ff', color: '#3b82f6',
                        fontSize: '0.78rem', fontWeight: 700,
                        padding: '2px 7px', borderRadius: 10, border: '1px solid #bfdbfe',
                      }}>{addr.zipcode}</span>
                    )}
                    {addr.address}
                    {addr.addrDetail && ` ${addr.addrDetail}`}
                  </span>
                </div>
              )}
            </div>

            {/* 카카오 지도 */}
            {hasAddr && (
              <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <div ref={mapRef} style={{ width: '100%', height: 260 }} />
              </div>
            )}

            <div className="modal-footer">
              {isAdmin && (
                <button className="btn btn-gray" onClick={() => setShowSetPw(true)}>
                  🔑 비밀번호 설정
                </button>
              )}
              {onEdit && (
                <button className="btn btn-blue" onClick={() => { onClose(); onEdit(emp); }}>
                  수정
                </button>
              )}
              <button className="btn btn-gray" onClick={onClose}>닫기</button>
            </div>
          </div>
        </div>
      </div>

      {showSetPw && (
        <SetPasswordModal emp={emp} onClose={() => setShowSetPw(false)} />
      )}
    </>
  );
};

export default EmpDetailModal;
