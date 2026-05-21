import React from 'react';
import '../styles/EmpTable.css';
import '../styles/Button.css';

// 정렬 방향 아이콘
const SortIcon = ({ colKey, sortKey, sortDir }) => {
  if (sortKey !== colKey) return <span className="sort-icon sort-none">↕</span>;
  return <span className="sort-icon sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

// 정렬 가능한 헤더 셀
const SortTh = ({ colKey, label, className, sortKey, sortDir, onSort }) => (
  <th className={`${className || ''} sortable`} onClick={() => onSort(colKey)}>
    {label} <SortIcon colKey={colKey} sortKey={sortKey} sortDir={sortDir} />
  </th>
);

// 사원 목록 테이블 컴포넌트
// props:
//   emps     - 사원 배열
//   onDetail - 상세보기 콜백 (emp 전달)
//   onEdit   - 수정 콜백 (emp 전달)
//   onDelete - 삭제 콜백 (empno 전달)
//   sortKey  - 현재 정렬 컬럼
//   sortDir  - 정렬 방향 ('asc' | 'desc')
//   onSort   - 정렬 변경 콜백 (colKey 전달)
const EmpTable = ({ emps, onDetail, onEdit, onDelete, sortKey, sortDir, onSort }) => {
  return (
    <div className="emp-table-wrapper">
      <table className="emp-table">
        <thead>
          <tr>
            <th className="center" style={{ width: '48px' }}></th>
            <SortTh colKey="empno"  label="사원번호" className="center"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh colKey="ename"  label="사원명"                        sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh colKey="job"    label="직업"                          sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh colKey="sal"    label="급여"    className="salary"    sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh colKey="deptno" label="부서번호" className="center"   sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
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
