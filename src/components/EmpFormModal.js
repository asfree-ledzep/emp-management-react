import React, { useState, useEffect } from 'react';
import { fetchDepts } from '../api/deptApi';
import { fetchMgrList, fetchEmpAddr } from '../api/empApi';
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
//   isAdmin - false이면 사원명·직책·사진만 수정 가능 (기본값 true)
const EmpFormModal = ({ mode, emp, onSave, onClose, saving = false, isAdmin = true }) => {
  const isEdit = mode === 'edit';
  // 사원 모드: 해당 필드 읽기 전용
  const readOnly = (field) => !isAdmin && !['ename', 'job', 'mgr'].includes(field);

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
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [depts, setDepts] = useState([]);
  const [emps,  setEmps]  = useState([]);
  const [addr, setAddr] = useState({ zipcode: '', address: '', addrDetail: '' });

  useEffect(() => {
    fetchDepts().then(setDepts).catch(() => {});
    fetchMgrList().then(setEmps).catch(() => {});
    // 카카오 우편번호 서비스 스크립트 동적 로드
    if (!window.daum?.Postcode) {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // 수정 모드일 때 기존 데이터로 폼 초기화 + 주소 조회
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
      if (emp.photoUrl) setPhotoPreview(emp.photoUrl);
      fetchEmpAddr(emp.empno)
        .then((data) => setAddr({ zipcode: data.zipcode ?? '', address: data.address ?? '', addrDetail: data.addrDetail ?? '' }))
        .catch(() => {});
    }
  }, [isEdit, emp]);

  // Canvas로 이미지를 최대 800px, 1MB 이하로 리사이징 후 Blob 반환
  const resizeImage = (file, maxPx = 800, maxBytes = 1024 * 1024) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        // 품질을 낮춰가며 maxBytes 이하가 될 때까지 압축
        let quality = 0.85;
        const tryEncode = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxBytes || quality <= 0.3) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              quality -= 0.1;
              tryEncode();
            }
          }, 'image/jpeg', quality);
        };
        tryEncode();
      };
      img.src = URL.createObjectURL(file);
    });

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setPhotoFile(resized);
    setPhotoPreview(URL.createObjectURL(resized));
  };

  // 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 카카오 주소 검색 팝업 열기
  const handleAddrSearch = () => {
    if (!window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddr((prev) => ({
          ...prev,
          zipcode: data.zonecode,
          address: data.roadAddress || data.jibunAddress,
        }));
      },
    }).open();
  };

  // 폼 제출: 숫자 필드 타입 변환 후 부모에 전달
  // _photoFile: 사진 업로드, _addrData: 주소 저장 (별도 API 호출용)
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      empno:  Number(form.empno),
      mgr:    form.mgr    !== '' ? Number(form.mgr)    : null,
      sal:    form.sal    !== '' ? Number(form.sal)    : null,
      comm:   form.comm   !== '' ? Number(form.comm)   : null,
      deptno: form.deptno !== '' ? Number(form.deptno) : null,
      _photoFile: photoFile,
      _addrData:  addr,
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
              disabled={isEdit || readOnly('empno')}
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
            <select
              name="mgr"
              value={form.mgr}
              onChange={handleChange}
              disabled={readOnly('mgr')}
            >
              <option value="">상사 없음</option>
              {emps
                .filter(e => e.empno !== Number(form.empno))   // 본인 제외
                .map(e => (
                  <option key={e.empno} value={e.empno}>
                    {e.empno} - {e.ename}{e.job ? ` (${e.job})` : ''}
                  </option>
                ))
              }
            </select>
          </div>
          <div className="form-row">
            <label>입사일</label>
            <input
              name="hiredate"
              type="date"
              value={form.hiredate}
              onChange={handleChange}
              disabled={readOnly('hiredate')}
            />
          </div>
          <div className="form-row">
            <label>급여</label>
            <input
              name="sal"
              type="text"
              inputMode="numeric"
              value={form.sal !== '' ? Number(form.sal).toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                handleChange({ target: { name: 'sal', value: raw } });
              }}
              disabled={readOnly('sal')}
              placeholder="급여 입력"
            />
          </div>
          <div className="form-row">
            <label>커미션</label>
            <input
              name="comm"
              type="text"
              inputMode="numeric"
              value={form.comm !== '' ? Number(form.comm).toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                handleChange({ target: { name: 'comm', value: raw } });
              }}
              disabled={readOnly('comm')}
              placeholder="커미션 입력"
            />
          </div>
          <div className="form-row">
            <label>부서번호</label>
            <select
              name="deptno"
              value={form.deptno}
              onChange={handleChange}
              disabled={readOnly('deptno')}
            >
              <option value="">부서 선택</option>
              {depts.map((d) => (
                <option key={d.deptno} value={d.deptno}>
                  {d.deptno} - {d.dname}
                </option>
              ))}
            </select>
          </div>

          {/* 주소 검색 (카카오 우편번호 서비스) */}
          <div className="form-row" style={{ alignItems: 'flex-start' }}>
            <label style={{ paddingTop: 6 }}>주소</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={addr.zipcode}
                  readOnly
                  placeholder="우편번호"
                  style={{ width: 100, background: '#f9fafb' }}
                />
                <button type="button" onClick={handleAddrSearch} className="btn btn-gray" style={{ flexShrink: 0 }}>
                  주소 검색
                </button>
              </div>
              <input
                value={addr.address}
                readOnly
                placeholder="기본 주소"
                style={{ background: '#f9fafb' }}
              />
              <input
                value={addr.addrDetail}
                onChange={(e) => setAddr((prev) => ({ ...prev, addrDetail: e.target.value }))}
                placeholder="상세 주소 입력"
              />
            </div>
          </div>

          <div className="form-row">
            <label>프로필 사진</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="미리보기"
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                />
              )}
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-gray" onClick={onClose} disabled={saving}>취소</button>
            <button type="submit" className="btn btn-blue" disabled={saving}>
              {saving ? (
                <><span className="spinner" /> {isEdit ? '저장 중...' : '등록 중...'}</>
              ) : (
                isEdit ? '수정 저장' : '등록'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmpFormModal;
