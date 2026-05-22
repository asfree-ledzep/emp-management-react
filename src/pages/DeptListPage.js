import React, { useEffect, useState } from 'react';
import DeptFormModal from '../components/DeptFormModal';
import DeptEmpModal from '../components/DeptEmpModal';
import { fetchDepts, createDept, updateDept, deleteDept } from '../api/deptApi';
import '../styles/EmpListPage.css';
import '../styles/EmpTable.css';
import '../styles/Button.css';

const DeptListPage = ({ onNavigateToEmp }) => {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  const loadDepts = () => {
    setLoading(true);
    fetchDepts()
      .then(setDepts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDepts(); }, []);

  const handleCreate = () => { setSelectedDept(null); setModalMode('create'); };
  const handleEdit = (dept) => { setSelectedDept(dept); setModalMode('edit'); };
  const handleEmps = (dept) => { setSelectedDept(dept); setModalMode('emps'); };
  const handleClose = () => { setModalMode(null); setSelectedDept(null); };

  const handleDelete = async (deptno) => {
    if (!window.confirm(`부서번호 ${deptno}을(를) 삭제하시겠습니까?\n소속 사원이 있으면 삭제할 수 없습니다.`)) return;
    try {
      await deleteDept(deptno);
      loadDepts();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (modalMode === 'create') {
        await createDept(formData);
      } else {
        await updateDept(formData.deptno, formData);
      }
      setModalMode(null);
      loadDepts();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  if (loading) return <div className="loading">부서 목록 불러오는 중...</div>;

  if (error) return (
    <div className="emp-list-page">
      <h1>부서 관리</h1>
      <div className="error-box">
        <span className="error-icon">⚠</span>
        <div className="error-text"><strong>데이터를 불러오지 못했습니다.</strong>{error}</div>
      </div>
    </div>
  );

  return (
    <div className="emp-list-page">
      <div className="page-header">
        <div>
          <h1>부서 관리</h1>
          <p className="emp-count">총 {depts.length}개 부서</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-gray btn-lg" onClick={onNavigateToEmp}>
            🏠 대시보드
          </button>
          <button className="btn btn-blue btn-lg" onClick={handleCreate}>
            + 부서 등록
          </button>
        </div>
      </div>

      {depts.length === 0 ? (
        <div className="empty-box">등록된 부서가 없습니다.</div>
      ) : (
        <table className="emp-table">
          <thead>
            <tr>
              <th>부서번호</th>
              <th>부서명</th>
              <th>위치</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((dept) => (
              <tr key={dept.deptno}>
                <td>{dept.deptno}</td>
                <td>{dept.dname}</td>
                <td>{dept.loc || '-'}</td>
                <td>
                  <button className="btn btn-sm btn-gray" onClick={() => handleEmps(dept)}>소속 사원</button>
                  <button className="btn btn-sm btn-green" onClick={() => handleEdit(dept)}>수정</button>
                  <button className="btn btn-sm btn-red" onClick={() => handleDelete(dept.deptno)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(modalMode === 'create' || modalMode === 'edit') && (
        <DeptFormModal mode={modalMode} dept={selectedDept} onSave={handleSave} onClose={handleClose} />
      )}

      {modalMode === 'emps' && (
        <DeptEmpModal dept={selectedDept} onClose={handleClose} />
      )}
    </div>
  );
};

export default DeptListPage;
