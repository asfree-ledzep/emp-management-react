import React, { useEffect, useState } from 'react';
import { fetchEmpsForOrg } from '../api/empApi';
import { fetchDepts } from '../api/deptApi';
import '../styles/OrgChartPage.css';

/* ── 부서별 색상 ── */
const DEPT_COLORS = {
  10: '#3b82f6',
  20: '#10b981',
  30: '#f97316',
  40: '#8b5cf6',
};
const getColor = (deptno) => DEPT_COLORS[deptno] || '#6b7280';

/* ── mgr 필드로 트리 구조 빌드 ── */
const buildTree = (emps) => {
  const map = {};
  emps.forEach(e => { map[e.empno] = { ...e, children: [] }; });
  const roots = [];
  emps.forEach(e => {
    if (e.mgr && map[e.mgr]) {
      map[e.mgr].children.push(map[e.empno]);
    } else {
      roots.push(map[e.empno]);
    }
  });
  return roots;
};

/* ── 트리에서 이름으로 일치하는 empno set 반환 ── */
const getMatchSet = (nodes, query) => {
  const q = query.toLowerCase();
  const result = new Set();
  const dfs = (node) => {
    if (node.ename?.toLowerCase().includes(q)) result.add(node.empno);
    node.children.forEach(dfs);
  };
  nodes.forEach(dfs);
  return result;
};

/* ═══════════════════════════════════
   재귀 노드 컴포넌트
═══════════════════════════════════ */
function OrgNode({ node, deptMap, matchSet, search, filterDept }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;
  const color    = getColor(node.deptno);
  const deptName = deptMap[node.deptno] || `Dept ${node.deptno}`;

  const isHighlighted = search && matchSet.has(node.empno);
  const isDimmed = (search && !isHighlighted) ||
                   (filterDept && String(node.deptno) !== String(filterDept));

  return (
    <div className="oc-item">
      {/* 카드 */}
      <div
        className={[
          'oc-card',
          hasChildren ? 'oc-clickable' : '',
          isHighlighted ? 'oc-highlighted' : '',
          isDimmed ? 'oc-dimmed' : '',
        ].join(' ')}
        style={{ borderTop: `3px solid ${color}` }}
        onClick={() => hasChildren && setCollapsed(c => !c)}
        title={hasChildren ? (collapsed ? '펼치기' : '접기') : ''}
      >
        {/* 프로필 사진 or 이니셜 */}
        {node.photoUrl ? (
          <img src={node.photoUrl} alt={node.ename} className="oc-avatar" />
        ) : (
          <div className="oc-avatar-placeholder" style={{ background: color }}>
            {(node.ename || '?')[0]}
          </div>
        )}

        <div className="oc-name">{node.ename || '-'}</div>
        <div className="oc-job">{node.job || '-'}</div>
        <div
          className="oc-dept-badge"
          style={{ background: color + '22', color }}
        >
          {deptName}
        </div>
        {hasChildren && (
          <div className="oc-toggle">
            {collapsed ? `▶ +${node.children.length}명` : '▼ 접기'}
          </div>
        )}
      </div>

      {/* 하위 조직 */}
      {hasChildren && !collapsed && (
        <>
          <div className="oc-down-line" style={{ background: color }} />
          <div className="oc-children-row">
            {node.children.map(child => (
              <div key={child.empno} className="oc-child-wrap">
                <OrgNode
                  node={child}
                  deptMap={deptMap}
                  matchSet={matchSet}
                  search={search}
                  filterDept={filterDept}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   메인 페이지
═══════════════════════════════════ */
function OrgChartPage({ onNavigateToList }) {
  const [roots,      setRoots]      = useState([]);
  const [deptMap,    setDeptMap]    = useState({});
  const [depts,      setDepts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [zoom,       setZoom]       = useState(1);

  useEffect(() => {
    Promise.all([fetchEmpsForOrg(), fetchDepts()])
      .then(([emps, deptList]) => {
        setRoots(buildTree(emps));
        const map = {};
        deptList.forEach(d => { map[d.deptno] = d.dname; });
        setDeptMap(map);
        setDepts(deptList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const matchSet = search.trim() ? getMatchSet(roots, search) : new Set();
  const zoomPct  = Math.round(zoom * 100);

  /* ── 스타일 ── */
  const controlBtn = (bg = '#f3f4f6', color = '#374151') => ({
    width: 28, height: 28, border: 'none', background: bg, color,
    borderRadius: 6, cursor: 'pointer', fontWeight: 700,
    fontSize: '1rem', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: '#6b7280', fontSize: '1rem' }}>
        조직도 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f1f5f9', fontFamily: 'inherit',
    }}>

      {/* ── 상단 컨트롤 바 ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px', background: '#fff',
        borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>🏢 조직도</h2>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* 검색 */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder="사원 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                border: '1px solid #d1d5db', borderRadius: 6,
                fontSize: '0.85rem', width: 150, outline: 'none',
              }}
            />
          </div>

          {/* 부서 필터 */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{
              padding: '7px 10px', border: '1px solid #d1d5db',
              borderRadius: 6, fontSize: '0.85rem', background: '#fff',
            }}
          >
            <option value="">전체 부서</option>
            {depts.map(d => (
              <option key={d.deptno} value={d.deptno}>{d.dname}</option>
            ))}
          </select>

          {/* 줌 컨트롤 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#f3f4f6', borderRadius: 8, padding: '4px 8px',
          }}>
            <button
              style={controlBtn()}
              onClick={() => setZoom(z => Math.max(+(z - 0.1).toFixed(1), 0.4))}
            >－</button>
            <span
              onClick={() => setZoom(1)}
              style={{
                width: 44, textAlign: 'center', fontSize: '0.8rem',
                fontWeight: 700, color: '#4f46e5', cursor: 'pointer',
              }}
              title="클릭 시 100% 초기화"
            >
              {zoomPct}%
            </span>
            <button
              style={controlBtn()}
              onClick={() => setZoom(z => Math.min(+(z + 0.1).toFixed(1), 2))}
            >＋</button>
          </div>

          {/* 대시보드 */}
          <button
            onClick={onNavigateToList}
            style={{
              padding: '8px 16px', background: '#6b7280', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
            }}
          >
            🏠 대시보드
          </button>
        </div>
      </div>

      {/* ── 부서 범례 ── */}
      <div style={{
        display: 'flex', gap: 20, padding: '8px 24px',
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {depts.map(d => (
          <button
            key={d.deptno}
            onClick={() => setFilterDept(filterDept === String(d.deptno) ? '' : String(d.deptno))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.78rem', border: 'none', background: 'none',
              cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
              fontWeight: filterDept === String(d.deptno) ? 700 : 400,
              color: filterDept === String(d.deptno) ? getColor(d.deptno) : '#374151',
              textDecoration: filterDept === String(d.deptno) ? 'underline' : 'none',
            }}
          >
            <span style={{
              width: 11, height: 11, borderRadius: 3,
              background: getColor(d.deptno), display: 'inline-block', flexShrink: 0,
            }} />
            {d.dname}
          </button>
        ))}
        {search && matchSet.size > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginLeft: 8 }}>
            🔍 {matchSet.size}명 검색됨
          </span>
        )}
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>
          카드 클릭 → 하위 조직 접기/펼치기 &nbsp;·&nbsp; 부서 범례 클릭 → 필터
        </span>
      </div>

      {/* ── 트리 뷰포트 ── */}
      <div className="oc-viewport">
        {roots.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: 60 }}>
            사원 데이터가 없습니다.
          </p>
        ) : (
          <div style={{
            display: 'inline-flex',
            flexDirection: 'row',
            gap: 60,
            alignItems: 'flex-start',
            zoom: zoom,           /* 줌: DOM 크기 자체를 변경 → 스크롤 정확 */
            transformOrigin: 'top left',
            minWidth: 'max-content',
          }}>
            {roots.map(root => (
              <OrgNode
                key={root.empno}
                node={root}
                deptMap={deptMap}
                matchSet={matchSet}
                search={search.trim()}
                filterDept={filterDept}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrgChartPage;
