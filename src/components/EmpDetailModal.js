import React from 'react';
import '../styles/Modal.css';
import '../styles/Button.css';

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

// 사원 상세보기 모달
// props:
//   emp     - 표시할 사원 데이터
//   onClose - 닫기 콜백
const EmpDetailModal = ({ emp, onClose }) => {
  if (!emp) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>사원 상세보기</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
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
              <span className="detail-value">{formatDate(emp.hiredate)}</span>
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
          </div>

          <div className="modal-footer">
            <button className="btn btn-gray" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpDetailModal;
