import React, { useEffect, useState } from 'react';
import { fetchDept } from '../api/deptApi';

const COMPANY_NAME = '○○ 주식회사';
const COMPANY_REP  = '홍길동';

const fmtDateKo = (val) => {
  if (!val) return '-';
  let s;
  if (Array.isArray(val)) {
    const [y, m, d] = val;
    s = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  } else {
    s = String(val).slice(0, 10);
  }
  const [y, m, d] = s.split('-');
  return `${y}년 ${m}월 ${d}일`;
};

const todayKo = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${String(now.getMonth()+1).padStart(2,'0')}월 ${String(now.getDate()).padStart(2,'0')}일`;
};

const calcService = (hiredate) => {
  if (!hiredate) return '-';
  let start;
  if (Array.isArray(hiredate)) {
    const [y, m, d] = hiredate;
    start = new Date(y, m - 1, d);
  } else {
    start = new Date(String(hiredate).slice(0, 10));
  }
  if (isNaN(start.getTime())) return '-';
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  const years  = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const fromStr = fmtDateKo(hiredate);
  const toStr   = todayKo();
  if (years === 0)  return `${fromStr} ~ ${toStr} (${months}개월)`;
  if (months === 0) return `${fromStr} ~ ${toStr} (${years}년)`;
  return `${fromStr} ~ ${toStr} (${years}년 ${months}개월)`;
};

/* ── 인쇄용 HTML 생성 ── */
const buildHtml = (emp, deptName) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>재직증명서</title>
<style>
  @page { size: A4 portrait; margin: 2.5cm 3cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'NanumGothic', sans-serif;
    font-size: 12pt;
    color: #111;
    line-height: 1.6;
  }
  .wrap { max-width: 600px; margin: 0 auto; }
  h1 {
    text-align: center;
    font-size: 26pt;
    font-weight: 900;
    letter-spacing: 18px;
    margin-bottom: 40px;
    padding-top: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 36px;
  }
  td {
    padding: 10px 14px;
    border: 1px solid #555;
    font-size: 11pt;
  }
  td:first-child {
    width: 30%;
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
  }
  .purpose-row td { background: #fff; }
  .body-text {
    text-align: center;
    font-size: 12pt;
    margin: 36px 0 48px;
    line-height: 2;
  }
  .footer {
    text-align: center;
    font-size: 11pt;
    line-height: 2.2;
  }
  .footer .date { font-size: 13pt; font-weight: 700; margin-bottom: 24px; }
  .footer .company { font-size: 14pt; font-weight: 900; }
  .footer .seal { font-size: 11pt; color: #444; }
  .stamp {
    display: inline-block;
    border: 3px solid #c0392b;
    color: #c0392b;
    font-size: 14pt;
    font-weight: 900;
    padding: 8px 18px;
    border-radius: 6px;
    margin-top: 8px;
    letter-spacing: 4px;
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>재 직 증 명 서</h1>
  <table>
    <tr>
      <td>성&nbsp;&nbsp;&nbsp;&nbsp;명</td>
      <td>${emp.ename ?? '-'}</td>
    </tr>
    <tr>
      <td>사&nbsp;&nbsp;&nbsp;&nbsp;번</td>
      <td>${emp.empno ?? '-'}</td>
    </tr>
    <tr>
      <td>소&nbsp;&nbsp;&nbsp;&nbsp;속</td>
      <td>${deptName ? `${deptName} (${emp.deptno}부서)` : (emp.deptno ?? '-')}</td>
    </tr>
    <tr>
      <td>직&nbsp;&nbsp;&nbsp;&nbsp;위</td>
      <td>${emp.job ?? '-'}</td>
    </tr>
    <tr>
      <td>입 사 일</td>
      <td>${fmtDateKo(emp.hiredate)}</td>
    </tr>
    <tr>
      <td>재직기간</td>
      <td>${calcService(emp.hiredate)}</td>
    </tr>
    <tr class="purpose-row">
      <td>사용목적</td>
      <td></td>
    </tr>
  </table>

  <div class="body-text">
    위 사람은 현재 당사에 재직 중임을 증명합니다.
  </div>

  <div class="footer">
    <div class="date">${todayKo()}</div>
    <div class="company">${COMPANY_NAME}</div>
    <div class="seal">대표이사&nbsp;&nbsp;${COMPANY_REP}&nbsp;&nbsp;(인)</div>
    <div><span class="stamp">직&nbsp;인</span></div>
  </div>
</div>
</body>
</html>`;

/* ── 컴포넌트 ── */
function CertificateModal({ emp, onClose }) {
  const [deptName, setDeptName] = useState('');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (emp?.deptno) {
      fetchDept(emp.deptno)
        .then(d => setDeptName(d.dname ?? ''))
        .catch(() => setDeptName(''));
    }
  }, [emp]);

  useEffect(() => {
    setHtml(buildHtml(emp, deptName));
  }, [emp, deptName]);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=1000');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const overlay = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
    display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000,
  };
  const modal = {
    background:'#fff', borderRadius:12, padding:'24px',
    width:'min(860px, 95vw)', maxHeight:'90vh',
    display:'flex', flexDirection:'column', gap:16,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:'1.1rem' }}>📄 재직증명서 미리보기</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
        </div>

        {/* 미리보기 iframe */}
        <div style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', minHeight:500 }}>
          <iframe
            title="재직증명서"
            srcDoc={html}
            style={{ width:'100%', height:'100%', minHeight:500, border:'none' }}
          />
        </div>

        {/* 하단 버튼 */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding:'9px 20px', background:'#6b7280', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}
          >
            닫기
          </button>
          <button
            onClick={handlePrint}
            style={{ padding:'9px 22px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.95rem' }}
          >
            🖨️ 출력 / PDF 저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default CertificateModal;
