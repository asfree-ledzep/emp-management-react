import React, { useEffect, useState } from 'react';
import EmpTable from '../components/EmpTable';
import EmpFormModal from '../components/EmpFormModal';
import EmpDetailModal from '../components/EmpDetailModal';
import { fetchEmps, createEmp, updateEmp, deleteEmp, uploadPhoto, exportEmpsExcel } from '../api/empApi';
import '../styles/EmpListPage.css';
import '../styles/Button.css';

// 검색 조건 옵션 목록
const SEARCH_OPTIONS = [
  { value: 'deptno', label: '부서번호', type: 'number', placeholder: '부서번호 입력 (예: 10)' },
  { value: 'empno',  label: '사원번호', type: 'number', placeholder: '사원번호 입력 (예: 7369)' },
  { value: 'ename',  label: '사원명',   type: 'text',   placeholder: '사원명 입력 (예: SMITH)' },
];

const PAGE_SIZE_OPTIONS = [3, 5, 10, 20, 50];

// 사원 목록 페이지
// Spring Boot API에서 전체 사원 데이터를 한 번 불러온 후
// 검색은 프론트엔드에서 필터링 처리 (부서번호 / 사원번호 / 사원명)
// props: onNavigateToChart - 급여 통계 차트 페이지로 이동 콜백
const EmpListPage = ({ onNavigateToChart, onNavigateToDept, onNavigateToNotice, onNavigateToSurvey, onNavigateToExpense, onNavigateToDashboard }) => {
  // 서버에서 받은 전체 원본 목록 (필터링의 기준)
  const [allEmps, setAllEmps] = useState([]);
  // 화면에 표시되는 목록 (검색 필터 적용 결과)
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 모달 상태: null | 'create' | 'edit' | 'detail'
  const [modalMode, setModalMode] = useState(null);
  // 수정/상세 시 선택된 사원
  const [selectedEmp, setSelectedEmp] = useState(null);
  // 저장 중 스피너 표시 여부
  const [saving, setSaving] = useState(false);

  // 검색 조건 (드롭다운 선택값)
  const [searchType, setSearchType] = useState('deptno');
  // 검색 입력값
  const [searchInput, setSearchInput] = useState('');
  // 필터 적용 여부 (전체보기 버튼 표시 조건)
  const [isFiltered, setIsFiltered] = useState(false);
  // 현재 페이지 (1부터 시작)
  const [currentPage, setCurrentPage] = useState(1);
  // 정렬 기준 컬럼 및 방향
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  // 페이지당 표시 사원 수
  const [pageSize, setPageSize] = useState(3);

  // 전체 사원 목록을 서버에서 새로 불러오고 검색 상태 초기화
  const loadEmps = () => {
    setLoading(true);
    setIsFiltered(false);
    setSearchInput('');
    setCurrentPage(1);
    fetchEmps()
      .then((data) => {
        setAllEmps(data);
        setEmps(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmps();
  }, []);

  // 검색 조건(드롭다운) 변경 시 입력값 초기화
  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchInput('');
  };

  // 검색 버튼 클릭 / Enter 입력: 프론트엔드에서 allEmps 필터링
  const handleSearch = () => {
    const keyword = searchInput.trim();
    if (!keyword) {
      alert('검색어를 입력해 주세요.');
      return;
    }

    let filtered;
    if (searchType === 'deptno') {
      // 부서번호: 숫자 완전 일치
      filtered = allEmps.filter((emp) => String(emp.deptno) === keyword);
    } else if (searchType === 'empno') {
      // 사원번호: 숫자 완전 일치
      filtered = allEmps.filter((emp) => String(emp.empno) === keyword);
    } else {
      // 사원명: 대소문자 구분 없이 포함 검색
      filtered = allEmps.filter(
        (emp) => emp.ename && emp.ename.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    setEmps(filtered);
    setIsFiltered(true);
    setCurrentPage(1);
  };

  // Enter 키 입력 시 검색 실행
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // 전체보기 버튼: 원본 전체 목록으로 복귀
  const handleReset = () => {
    setSearchInput('');
    setEmps(allEmps);
    setIsFiltered(false);
    setCurrentPage(1);
  };

  // 등록 버튼 클릭: 빈 폼 모달 열기
  const handleCreate = () => {
    setSelectedEmp(null);
    setModalMode('create');
  };

  // 수정 버튼 클릭: 해당 사원 데이터로 폼 모달 열기
  const handleEdit = (emp) => {
    setSelectedEmp(emp);
    setModalMode('edit');
  };

  // 상세보기 버튼 클릭: 상세 모달 열기
  const handleDetail = (emp) => {
    setSelectedEmp(emp);
    setModalMode('detail');
  };

  // 삭제 버튼 클릭: 확인 후 API 호출 → 전체 목록으로 복귀
  const handleDelete = async (empno) => {
    if (!window.confirm(`사원번호 ${empno}을(를) 삭제하시겠습니까?`)) return;
    try {
      await deleteEmp(empno);
      loadEmps();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 폼 저장: 등록 또는 수정 API 호출 후 사진 업로드, 전체 목록으로 복귀
  const handleSave = async (formData) => {
    const { _photoFile, ...empData } = formData;
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await createEmp(empData);
      } else {
        await updateEmp(empData.empno, empData);
      }
      if (_photoFile) {
        await uploadPhoto(empData.empno, _photoFile);
      }
      setModalMode(null);
      loadEmps();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 엑셀 내보내기: S3에 업로드 후 다운로드
  const handleExport = async () => {
    try {
      const { url } = await exportEmpsExcel();
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
    } catch (err) {
      alert('엑셀 내보내기 실패: ' + err.message);
    }
  };

  // 컬럼 헤더 클릭 시 정렬: 같은 컬럼이면 방향 전환, 다른 컬럼이면 오름차순으로 새로 정렬
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // 모달 닫기
  const handleClose = () => {
    setModalMode(null);
    setSelectedEmp(null);
  };

  // 현재 선택된 검색 조건 옵션 객체
  const currentOption = SEARCH_OPTIONS.find((o) => o.value === searchType);

  // 정렬 적용
  const sortedEmps = [...emps].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // 페이징 계산
  const totalPages = Math.ceil(sortedEmps.length / pageSize);
  const pagedEmps = sortedEmps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 로딩 중 표시
  if (loading) {
    return <div className="loading">사원 목록 불러오는 중...</div>;
  }

  // 에러 발생 시 표시
  if (error) {
    return (
      <div className="emp-list-page">
        <h1>사원 목록</h1>
        <div className="error-box">
          <span className="error-icon">⚠</span>
          <div className="error-text">
            <strong>데이터를 불러오지 못했습니다.</strong>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-list-page">
      {/* 상단 헤더: 제목/카운트(좌) + 등록 버튼(우) */}
      <div className="page-header">
        <div>
          <h1>사원 목록</h1>
          <p className="emp-count">
            {isFiltered ? `검색 결과 ${emps.length}명` : `총 ${allEmps.length}명`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-gray btn-lg" onClick={onNavigateToDashboard}>
            🏠 대시보드
          </button>
          <button className="btn btn-gray btn-lg" onClick={onNavigateToChart}>
            급여 통계 차트
          </button>
          <button className="btn btn-green btn-lg" onClick={handleExport}>
            엑셀 내보내기
          </button>
          <button className="btn btn-gray btn-lg" onClick={onNavigateToDept}>
            부서 관리
          </button>
          <button className="btn btn-blue btn-lg" onClick={handleCreate}>
            + 사원 등록
          </button>
        </div>
      </div>

      {/* 검색 바: 조건 드롭다운 + 입력창 + 버튼 한 줄 정렬 */}
      <div className="search-bar">
        {/* 검색 조건 선택 드롭다운 */}
        <select
          className="search-select"
          value={searchType}
          onChange={handleSearchTypeChange}
        >
          {SEARCH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 선택한 조건에 맞는 입력창 */}
        <input
          type={currentOption.type}
          className="search-input"
          placeholder={currentOption.placeholder}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button className="btn btn-blue" onClick={handleSearch}>
          검색
        </button>

        {/* 검색 중일 때만 전체보기 버튼 표시 */}
        {isFiltered && (
          <button className="btn btn-gray" onClick={handleReset}>
            전체보기
          </button>
        )}

        {/* 페이지당 표시 수 선택 */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap' }}>표시 수</span>
          <select
            className="search-select"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}명</option>
            ))}
          </select>
        </div>
      </div>

      {/* 검색 결과 없음 또는 목록 표시 */}
      {emps.length === 0 ? (
        <div className="empty-box">
          {isFiltered ? '검색 결과가 없습니다.' : '등록된 사원이 없습니다.'}
        </div>
      ) : (
        <>
          <EmpTable
            emps={pagedEmps}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn${currentPage === page ? ' active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}

      {/* 등록/수정 폼 모달 */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <EmpFormModal
          mode={modalMode}
          emp={selectedEmp}
          onSave={handleSave}
          onClose={handleClose}
          saving={saving}
        />
      )}

      {/* 상세보기 모달 */}
      {modalMode === 'detail' && (
        <EmpDetailModal
          emp={selectedEmp}
          onClose={handleClose}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default EmpListPage;
