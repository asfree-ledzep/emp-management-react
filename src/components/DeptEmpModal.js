import React, { useEffect, useState } from 'react';
import { fetchEmpsByDept } from '../api/deptApi';
import '../styles/Modal.css';
import '../styles/Button.css';

const DeptEmpModal = ({ dept, onClose }) => {
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpsByDept(dept.deptno)
      .then(setEmps)
      .finally(() => setLoading(false));
  }, [dept.deptno]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{dept.dname} ({dept.deptno}) 소속 사원</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">불러오는 중...</div>
          ) : emps.length === 0 ? (
            <div className="empty-box">소속 사원이 없습니다.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                  <th style={th}>사원번호</th>
                  <th style={th}>사원명</th>
                  <th style={th}>직책</th>
                  <th style={th}>급여</th>
                </tr>
              </thead>
              <tbody>
                {emps.map((emp) => (
                  <tr key={emp.empno} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={td}>{emp.empno}</td>
                    <td style={td}>{emp.ename}</td>
                    <td style={td}>{emp.job}</td>
                    <td style={td}>{emp.sal?.toLocaleString()} 원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="modal-footer">
            <button className="btn btn-gray" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const th = { padding: '10px 14px', textAlign: 'center', fontWeight: 600 };
const td = { padding: '10px 14px', textAlign: 'center', color: '#374151' };

export default DeptEmpModal;
