import React, { useEffect, useState } from 'react';
import { fetchDept } from '../api/deptApi';

const COMPANY_NAME = '○○ 주식회사';

const now = new Date();
const THIS_YEAR  = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

/* ── 공제액 계산 ── */
const calcDeductions = (sal) => {
  const base = Math.floor(sal ?? 0);
  const pension    = Math.round(base * 0.045);                  // 국민연금 4.5%
  const health     = Math.round(base * 0.03545);                // 건강보험 3.545%
  const longCare   = Math.round(health * 0.1281);               // 장기요양 건강보험의 12.81%
  const employ     = Math.round(base * 0.009);                  // 고용보험 0.9%
  const incomeTax  = Math.round(base * 0.03);                   // 소득세 근사 3%
  const localTax   = Math.round(incomeTax * 0.1);               // 주민세 10%
  const total      = pension + health + longCare + employ + incomeTax + localTax;
  const netPay     = base - total;
  return { pension, health, longCare, employ, incomeTax, localTax, total, netPay };
};

const fmtWon = (v) => Math.floor(v ?? 0).toLocaleString('ko-KR') + ' 원';
const todayKo = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`;
};

/* ── 인쇄용 HTML ── */
const buildHtml = (emp, deptName, year, month) => {
  const ded = calcDeductions(emp.sal);
  const row  = (label, value, cls='') =>
    `<tr class="${cls}"><td>${label}</td><td class="amount">${fmtWon(value)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>급여명세서</title>
<style>
  @page { size: A4 portrait; margin: 2cm 2.5cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'NanumGothic', sans-serif;
    font-size: 11pt;
    color: #111;
    line-height: 1.5;
  }
  .wrap { max-width: 620px; margin: 0 auto; }
  h1 {
    text-align: center;
    font-size: 22pt;
    font-weight: 900;
    letter-spacing: 12px;
    margin-bottom: 6px;
    padding-top: 10px;
  }
  .subtitle { text-align: center; font-size: 13pt; font-weight: 700; margin-bottom: 24px; color: #333; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .info-table td {
    padding: 7px 12px;
    border: 1px solid #aaa;
    font-size: 10.5pt;
  }
  .info-table td:first-child, .info-table td:nth-child(3) {
    width: 22%;
    background: #f0f0f0;
    font-weight: 700;
    text-align: center;
  }
  .section-title {
    background: #2d3a8c;
    color: #fff;
    font-size: 11pt;
    font-weight: 700;
    padding: 7px 12px;
    margin-bottom: 0;
  }
  .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .detail-table td {
    padding: 7px 12px;
    border: 1px solid #ccc;
    font-size: 10.5pt;
  }
  .detail-table td:first-child { width: 55%; background: #fafafa; }
  .detail-table .amount { text-align: right; font-feature-settings: "tnum"; }
  .detail-table .subtotal td {
    background: #eef0f8;
    font-weight: 700;
    border-top: 2px solid #2d3a8c;
  }
  .net-row {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .net-row td {
    padding: 12px 16px;
    border: 2px solid #2d3a8c;
    font-size: 13pt;
    font-weight: 900;
  }
  .net-row .label { background: #2d3a8c; color: #fff; width: 40%; }
  .net-row .value { background: #fffbe6; color: #1a1a1a; text-align: right; }
  .footer {
    text-align: center;
    margin-top: 36px;
    font-size: 11pt;
    line-height: 2;
  }
  .footer .company { font-size: 13pt; font-weight: 900; }
  .notice {
    margin-top: 20px;
    padding: 10px 14px;
    background: #f8f8f8;
    border-left: 3px solid #aaa;
    font-size: 9pt;
    color: #555;
    line-height: 1.8;
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>급 여 명 세 서</h1>
  <div class="subtitle">${year}년 ${month}월 귀속</div>

  <!-- 인적사항 -->
  <table class="info-table">
    <tr>
      <td>성&nbsp;&nbsp;명</td><td>${emp.ename ?? '-'}</td>
      <td>사&nbsp;&nbsp;번</td><td>${emp.empno ?? '-'}</td>
    </tr>
    <tr>
      <td>부&nbsp;&nbsp;서</td>
      <td>${deptName ? `${deptName} (${emp.deptno})` : (emp.deptno ?? '-')}</td>
      <td>직&nbsp;&nbsp;위</td>
      <td>${emp.job ?? '-'}</td>
    </tr>
    <tr>
      <td>지급일</td>
      <td colspan="3">${year}년 ${String(month).padStart(2,'0')}월 25일</td>
    </tr>
  </table>

  <!-- 지급 내역 -->
  <div class="section-title">💰 지급 내역</div>
  <table class="detail-table">
    ${row('기본급', emp.sal ?? 0)}
    ${(emp.comm && emp.comm > 0) ? row('커미션', emp.comm) : ''}
    <tr class="subtotal"><td>지급 합계</td><td class="amount">${fmtWon((emp.sal ?? 0) + (emp.comm ?? 0))}</td></tr>
  </table>

  <!-- 공제 내역 -->
  <div class="section-title">📉 공제 내역</div>
  <table class="detail-table">
    ${row('국민연금 (4.5%)', ded.pension)}
    ${row('건강보험 (3.545%)', ded.health)}
    ${row('장기요양보험 (건강보험 × 12.81%)', ded.longCare)}
    ${row('고용보험 (0.9%)', ded.employ)}
    ${row('소득세 (근사치)', ded.incomeTax)}
    ${row('주민세 (소득세 × 10%)', ded.localTax)}
    <tr class="subtotal"><td>공제 합계</td><td class="amount">${fmtWon(ded.total)}</td></tr>
  </table>

  <!-- 실수령액 -->
  <table class="net-row">
    <tr>
      <td class="label">실&nbsp;수&nbsp;령&nbsp;액</td>
      <td class="value">${fmtWon(ded.netPay)}</td>
    </tr>
  </table>

  <div class="notice">
    ※ 소득세는 간이세액표 기준 근사치이며, 연말정산 시 최종 확정됩니다.<br>
    ※ 이 명세서는 사내 발급용입니다. 외부 제출 시 인사담당자 확인이 필요합니다.
  </div>

  <div class="footer">
    <div style="margin-bottom:8px;">${todayKo()}</div>
    <div class="company">${COMPANY_NAME} 대표이사 (인)</div>
  </div>
</div>
</body>
</html>`;
};

/* ── 컴포넌트 ── */
function SalarySlipModal({ emp, onClose }) {
  const [deptName, setDeptName] = useState('');
  const [year,  setYear]  = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [html,  setHtml]  = useState('');

  useEffect(() => {
    if (emp?.deptno) {
      fetchDept(emp.deptno)
        .then(d => setDeptName(d.dname ?? ''))
        .catch(() => setDeptName(''));
    }
  }, [emp]);

  useEffect(() => {
    setHtml(buildHtml(emp, deptName, year, month));
  }, [emp, deptName, year, month]);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=1050');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const selectStyle = {
    padding: '6px 10px', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: '0.9rem',
  };
  const YEAR_OPTIONS = Array.from({ length: THIS_YEAR - 2000 + 2 }, (_, i) => 2000 + i);

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:12, padding:'24px', width:'min(880px, 95vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', gap:16 }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:'1.1rem' }}>💵 급여명세서 미리보기</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
        </div>

        {/* 연도·월 선택 */}
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={year}  onChange={e => setYear(Number(e.target.value))}  style={selectStyle}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
            {Array.from({length:12},(_,i)=>i+1).map(m =>
              <option key={m} value={m}>{m}월</option>)}
          </select>
          <span style={{ fontSize:'0.82rem', color:'#6b7280' }}>※ 기본급 기준으로 생성됩니다</span>
        </div>

        {/* 미리보기 */}
        <div style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', minHeight:480 }}>
          <iframe
            title="급여명세서"
            srcDoc={html}
            style={{ width:'100%', height:'100%', minHeight:480, border:'none' }}
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
            style={{ padding:'9px 22px', background:'#059669', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.95rem' }}
          >
            🖨️ 출력 / PDF 저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalarySlipModal;
