import './App.css';
import { useState } from 'react';
import EmpListPage from './pages/EmpListPage';
import SalaryChartPage from './pages/SalaryChartPage';

function App() {
  // 현재 페이지 상태: 'list' | 'chart'
  const [page, setPage] = useState('list');

  return (
    <div className="App">
      {page === 'list' ? (
        <EmpListPage onNavigateToChart={() => setPage('chart')} />
      ) : (
        <SalaryChartPage onNavigateToList={() => setPage('list')} />
      )}
    </div>
  );
}

export default App;
