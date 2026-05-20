import React, { useState, useEffect } from 'react';
import '../styles/Modal.css';
import '../styles/Button.css';

const DeptFormModal = ({ mode, dept, onSave, onClose }) => {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({ deptno: '', dname: '', loc: '' });

  useEffect(() => {
    if (isEdit && dept) {
      setForm({
        deptno: dept.deptno ?? '',
        dname:  dept.dname  ?? '',
        loc:    dept.loc    ?? '',
      });
    }
  }, [isEdit, dept]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, deptno: Number(form.deptno) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? '부서 수정' : '부서 등록'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <label>부서번호</label>
            <input
              name="deptno"
              type="number"
              value={form.deptno}
              onChange={handleChange}
              disabled={isEdit}
              required
              placeholder="부서번호 입력 (예: 50)"
            />
          </div>
          <div className="form-row">
            <label>부서명</label>
            <input
              name="dname"
              value={form.dname}
              onChange={handleChange}
              required
              placeholder="부서명 입력"
            />
          </div>
          <div className="form-row">
            <label>위치</label>
            <input
              name="loc"
              value={form.loc}
              onChange={handleChange}
              placeholder="위치 입력"
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

export default DeptFormModal;
