import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fetchEmps } from '../api/empApi';
import '../styles/SalaryChartPage.css';
import '../styles/EmpListPage.css';
import '../styles/Button.css';

// 금액을 천 단위 구분 + 원 단위로 포맷
const formatMoney = (value) => value.toLocaleString('ko-KR') + ' 원';

// Y축 눈금 포맷 (짧게 표시)
const formatYAxis = (value) => {
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value;
};

// 부서별 급여 통계 차트 페이지
// props: onNavigateToList - 사원 목록 페이지로 이동 콜백
const SalaryChartPage = ({ onNavigateToList }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmps()
      .then((emps) => {
        // 부서별 그룹화 후 평균/최고/최저/인원 계산
        const map = {};
        emps.forEach((emp) => {
          if (emp.deptno == null || emp.sal == null) return;
          if (!map[emp.deptno]) map[emp.deptno] = { sals: [] };
          map[emp.deptno].sals.push(emp.sal);
        });
        const result = Object.keys(map)
          .sort((a, b) => Number(a) - Number(b))
          .map((deptno) => {
            const sals = map[deptno].sals;
            return {
              deptno: Number(deptno),
              avgSal: sals.reduce((s, v) => s + v, 0) / sals.length,
              maxSal: Math.max(...sals),
              minSal: Math.min(...sals),
              empCount: sals.length,
            };
          });
        setStats(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // 로딩 중 표시
  if (loading) return <div className="loading">급여 통계 불러오는 중...</div>;

  // 에러 발생 시 표시
  if (error) {
    return (
      <div className="chart-page">
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

  // recharts용 데이터 포맷 변환
  const chartData = stats.map((s) => ({
    name: `${s.deptno}번 부서`,
    평균급여: Math.round(s.avgSal),
    최고급여: s.maxSal,
    최저급여: s.minSal,
  }));

  return (
    <div className="chart-page">
      {/* 헤더: 제목(좌) + 목록으로 버튼(우) */}
      <div className="page-header">
        <div>
          <h1>급여 통계</h1>
          <p className="sub-text">부서별 급여 현황 · 총 {stats.length}개 부서</p>
        </div>
        <button className="btn btn-gray btn-lg" onClick={onNavigateToList}>
          ← 목록으로
        </button>
      </div>

      {/* 부서별 평균/최고/최저 급여 막대 차트 */}
      <div className="chart-card">
        <h2>부서별 급여 비교 (원)</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 13 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatMoney(value)} />
            <Legend />
            {/* 평균 급여: 파란색 */}
            <Bar dataKey="평균급여" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            {/* 최고 급여: 초록색 */}
            <Bar dataKey="최고급여" fill="#22c55e" radius={[4, 4, 0, 0]} />
            {/* 최저 급여: 주황색 */}
            <Bar dataKey="최저급여" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 부서별 통계 요약 카드 */}
      <div className="stat-cards">
        {stats.map((s) => (
          <div key={s.deptno} className="stat-card">
            <div className="stat-card-title">{s.deptno}번 부서</div>
            <div className="stat-row">
              <span>사원 수</span>
              <span>{s.empCount}명</span>
            </div>
            <div className="stat-row">
              <span>평균 급여</span>
              <span>{formatMoney(Math.round(s.avgSal))}</span>
            </div>
            <div className="stat-row max">
              <span>최고 급여</span>
              <span>{formatMoney(s.maxSal)}</span>
            </div>
            <div className="stat-row min">
              <span>최저 급여</span>
              <span>{formatMoney(s.minSal)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalaryChartPage;
