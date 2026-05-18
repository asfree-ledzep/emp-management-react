import React, { useState, useEffect } from 'react';
import '../styles/Modal.css';
import '../styles/Button.css';

// 날짜 배열 [year, month, day] 또는 문자열을 input[type=date] 형식(YYYY-MM-DD)으로 변환
const toInputDate = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) {
    const [y, m, d] = val;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(val).slice(0, 10);
};

// 사원 등록/수정 폼 모달
// props:
//   mode    - 'create' | 'edit'
//   emp     - 수정 시 기존 사원 데이터
//   onSave  - 저장 콜백 (formData 전달)
//   onClose - 닫기 콜백
const EmpFormModal = ({ mode, emp, onSave, onClose }) => {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    empno: '',
    ename: '',
    job: '',
    mgr: '',
    hiredate: '',
    sal: '',
    comm: '',
    deptno: '',
  });

  // 수정 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (isEdit && emp) {
      setForm({
        empno:    emp.empno    ?? '',
        ename:    emp.ename    ?? '',
        job:      emp.job      ?? '',
        mgr:      emp.mgr      ?? '',
        hiredate: toInputDate(emp.hiredate),
        sal:      emp.sal      ?? '',
        comm:     emp.comm     ?? '',
        deptno:   emp.deptno   ?? '',
      });
    }
  }, [isEdit, emp]);

  // 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 폼 제출: 숫자 필드 타입 변환 후 부모에 전달
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      empno:  Number(form.empno),
      mgr:    form.mgr    !== '' ? Number(form.mgr)    : null,
      sal:    form.sal    !== '' ? Number(form.sal)    : null,
      comm:   form.comm   !== '' ? Number(form.comm)   : null,
      deptno: form.deptno !== '' ? Number(form.deptno) : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? '사원 수정' : '사원 등록'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <label>사번</label>
            <input
              name="empno"
              type="number"
              value={form.empno}
              onChange={handleChange}
              disabled={isEdit}
              required
              placeholder="사번 입력"
            />
          </div>
          <div className="form-row">
            <label>사원명</label>
            <input
              name="ename"
              value={form.ename}
              onChange={handleChange}
              required
              placeholder="이름 입력"
            />
          </div>
          <div className="form-row">
            <label>직책</label>
            <input
              name="job"
              value={form.job}
              onChange={handleChange}
              placeholder="직책 입력"
            />
          </div>
          <div className="form-row">
            <label>상사 사번</label>
            <input
              name="mgr"
              type="number"
              value={form.mgr}
              onChange={handleChange}
              placeholder="상사 사번 입력"
            />
          </div>
          <div className="form-row">
            <label>입사일</label>
            <input
              name="hiredate"
              type="date"
              value={form.hiredate}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <label>급여</label>
            <input
              name="sal"
              type="number"
              value={form.sal}
              onChange={handleChange}
              placeholder="급여 입력"
            />
          </div>
          <div className="form-row">
            <label>커미션</label>
            <input
              name="comm"
              type="number"
              value={form.comm}
              onChange={handleChange}
              placeholder="커미션 입력"
            />
          </div>
          <div className="form-row">
            <label>부서번호</label>
            <input
              name="deptno"
              type="number"
              value={form.deptno}
              onChange={handleChange}
              placeholder="부서번호 입력"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-gray" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-blue">
              {isEdit ? '수정 저장' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmpFormModal;
