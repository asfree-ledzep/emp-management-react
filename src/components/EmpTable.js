import React from 'react';
import '../styles/EmpTable.css';
import '../styles/Button.css';

// 사원 목록 테이블 컴포넌트
// props:
//   emps     - 사원 배열
//   onDetail - 상세보기 콜백 (emp 전달)
//   onEdit   - 수정 콜백 (emp 전달)
//   onDelete - 삭제 콜백 (empno 전달)
const EmpTable = ({ emps, onDetail, onEdit, onDelete }) => {
  return (
    <div className="emp-table-wrapper">
      <table className="emp-table">
        <thead>
          <tr>
            <th className="center" style={{ width: '48px' }}></th>
            <th className="center">사원번호</th>
            <th>사원명</th>
            <th>직업</th>
            <th className="salary">급여</th>
            <th className="center">부서번호</th>
            <th className="center">관리</th>
          </tr>
        </thead>
        <tbody>
          {emps.map((emp) => (
            <tr key={emp.empno}>
              <td className="center">
                {emp.photoUrl
                  ? <img src={emp.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', margin: '0 auto' }} />
                }
              </td>
              <td className="center">{emp.empno}</td>
              <td>{emp.ename}</td>
              <td>{emp.job}</td>
              {/* 급여: 천 단위 구분자 + 원 단위 표시 */}
              <td className="salary">
                {emp.sal != null ? emp.sal.toLocaleString('ko-KR') + ' 원' : '-'}
              </td>
              <td className="center">{emp.deptno}</td>
              {/* 각 행 CRUD 액션 버튼 */}
              <td className="center action-cell">
                <button className="btn btn-gray"  onClick={() => onDetail(emp)}>상세</button>
                <button className="btn btn-green" onClick={() => onEdit(emp)}>수정</button>
                <button className="btn btn-red"   onClick={() => onDelete(emp.empno)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmpTable;
