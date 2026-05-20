import './App.css';
import { useState } from 'react';
import EmpListPage from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';
import DeptListPage from './pages/DeptListPage';

function App() {
  // 현재 페이지 상태: 'list' | 'chart' | 'dept'
  const [page, setPage] = useState('list');

  return (
    <div className="App">
      {page === 'list' && (
        <EmpListPage
          onNavigateToChart={() => setPage('chart')}
          onNavigateToDept={() => setPage('dept')}
        />
      )}
      {page === 'chart' && (
        <SalaryChartPage onNavigateToList={() => setPage('list')} />
      )}
      {page === 'dept' && (
        <DeptListPage onNavigateToEmp={() => setPage('list')} />
      )}
    </div>
  );
}

export default App;
