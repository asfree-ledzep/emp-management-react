import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/apiClient';

/**
 * 관리자 정보 수정 + 추가 관리자 지정 모달
 * Props: darkMode, onClose, onNameChange (displayName이 바뀌면 App에 알림)
 */
export default function AdminProfileModal({ darkMode, onClose, onNameChange }) {
  const dk = darkMode;
  const C = {
    overlay: 'rgba(0,0,0,0.6)',
    card:    dk ? '#1e293b' : '#ffffff',
    border:  dk ? '#334155' : '#e2e8f0',
    text:    dk ? '#e2e8f0' : '#1e293b',
    sub:     dk ? '#94a3b8' : '#64748b',
    inputBg: dk ? '#0f172a' : '#f8fafc',
    inputBd: dk ? '#475569' : '#cbd5e1',
    tabActiveBg: dk ? '#4f46e5' : '#4f46e5',
  };

  const [tab, setTab] = useState('profile'); // 'profile' | 'proxy'

  /* ── 프로필 탭 상태 ── */
  const [profile,      setProfile]      = useState({ displayName: '', empnoDisplay: '', deptno: '' });
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg,   setProfileMsg]   = useState('');

  /* ── 대리 관리자 탭 상태 ── */
  const [proxies,      setProxies]      = useState([]);
  const [proxyInput,   setProxyInput]   = useState('');  // 사번 직접 입력
  const [emps,         setEmps]         = useState([]);  // 직원 목록
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyMsg,     setProxyMsg]     = useState('');

  /* ── 프로필 로드 ── */
  const loadProfile = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/profile');
      const data = await res.json();
      setProfile({
        displayName:  data.displayName  || '',
        empnoDisplay: data.empnoDisplay || '',
        deptno:       data.deptno != null ? String(data.deptno) : '',
      });
    } catch {}
  }, []);

  /* ── 대리 관리자 목록 로드 ── */
  const loadProxies = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/proxy');
      const data = await res.json();
      setProxies(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  /* ── 직원 목록 로드 ── */
  const loadEmps = useCallback(async () => {
    try {
      const res = await authFetch('/api/emp');
      const data = await res.json();
      setEmps(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    loadProfile();
    loadProxies();
    loadEmps();
  }, [loadProfile, loadProxies, loadEmps]);

  /* ── 프로필 저장 ── */
  const saveProfile = async () => {
    if (newPw && newPw !== confirmPw) {
      setProfileMsg('❌ 새 비밀번호가 일치하지 않습니다.'); return;
    }
    if (newPw && newPw.length < 4) {
      setProfileMsg('❌ 비밀번호는 4자 이상이어야 합니다.'); return;
    }
    setProfileSaving(true); setProfileMsg('');
    try {
      const body = {
        displayName:  profile.displayName,
        empnoDisplay: profile.empnoDisplay,
        deptno:       profile.deptno,
        ...(newPw ? { newPassword: newPw } : {}),
      };
      const res = await authFetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setProfileMsg('❌ ' + (err.message || '저장 실패'));
      } else {
        setProfileMsg('✅ 저장되었습니다.');
        setNewPw(''); setConfirmPw('');
        if (profile.displayName && onNameChange) onNameChange(profile.displayName);
      }
    } catch { setProfileMsg('❌ 저장 중 오류가 발생했습니다.'); }
    finally  { setProfileSaving(false); }
  };

  /* ── 대리 관리자 추가 ── */
  const addProxy = async () => {
    const empno = parseInt(proxyInput.trim());
    if (!empno || isNaN(empno)) { setProxyMsg('❌ 유효한 사번을 입력하세요.'); return; }
    setProxyLoading(true); setProxyMsg('');
    try {
      const res = await authFetch(`/api/admin/proxy/${empno}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setProxyMsg('❌ ' + (err.message || '추가 실패'));
      } else {
        const data = await res.json();
        setProxyMsg(`✅ ${data.ename || empno}님을 대리 관리자로 지정했습니다.`);
        setProxyInput('');
        await loadProxies();
      }
    } catch { setProxyMsg('❌ 추가 중 오류가 발생했습니다.'); }
    finally  { setProxyLoading(false); }
  };

  /* ── 대리 관리자 제거 ── */
  const removeProxy = async (empno, ename) => {
    if (!window.confirm(`${ename}(${empno})의 대리 관리자 권한을 해제하시겠습니까?`)) return;
    try {
      await authFetch(`/api/admin/proxy/${empno}`, { method: 'DELETE' });
      await loadProxies();
      setProxyMsg(`✅ ${ename} 권한 해제 완료`);
    } catch { setProxyMsg('❌ 해제 실패'); }
  };

  /* ── input 스타일 헬퍼 ── */
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${C.inputBd}`, outline: 'none',
    background: C.inputBg, color: C.text, fontSize: '0.88rem',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '0.78rem', fontWeight: 600, color: C.sub,
    display: 'block', marginBottom: 5,
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 4000 }}
      />

      {/* 모달 */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 4001, width: 'min(500px, 94vw)',
        background: C.card, borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        maxHeight: '88vh',
      }}>

        {/* 헤더 */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: dk ? '#0f172a' : '#f8fafc',
        }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: C.text }}>
            🛡️ 관리자 설정
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.sub, fontSize: '1.2rem', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${C.border}`,
          background: dk ? '#1e293b' : '#f8fafc',
        }}>
          {[
            { key: 'profile', label: '👤 내 정보 수정' },
            { key: 'proxy',   label: '🔑 추가 관리자' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#4f46e5' : 'transparent',
              color: tab === t.key ? '#fff' : C.sub,
              fontWeight: tab === t.key ? 700 : 400, fontSize: '0.85rem',
              borderBottom: tab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── 프로필 탭 ── */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={labelStyle}>표시 이름 (대시보드 인사말 반영)</label>
                <input style={inputStyle} value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="예: 홍길동" />
              </div>

              <div>
                <label style={labelStyle}>사번 (표시용)</label>
                <input style={inputStyle} value={profile.empnoDisplay}
                  onChange={e => setProfile(p => ({ ...p, empnoDisplay: e.target.value }))}
                  placeholder="예: ADMIN-001" />
              </div>

              <div>
                <label style={labelStyle}>부서번호 (표시용)</label>
                <input style={inputStyle} value={profile.deptno} type="number"
                  onChange={e => setProfile(p => ({ ...p, deptno: e.target.value }))}
                  placeholder="예: 10" />
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <label style={labelStyle}>새 비밀번호 (변경 시에만 입력)</label>
                <input style={inputStyle} type="password" value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="새 비밀번호 (4자 이상)" />
              </div>

              <div>
                <label style={labelStyle}>새 비밀번호 확인</label>
                <input style={inputStyle} type="password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="새 비밀번호 다시 입력" />
              </div>

              {profileMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                  background: profileMsg.startsWith('✅') ? '#dcfce7' : '#fef2f2',
                  color:      profileMsg.startsWith('✅') ? '#15803d' : '#dc2626',
                }}>{profileMsg}</div>
              )}

              <button onClick={saveProfile} disabled={profileSaving} style={{
                padding: '10px', borderRadius: 8, border: 'none',
                background: profileSaving ? '#94a3b8' : '#4f46e5',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                cursor: profileSaving ? 'default' : 'pointer',
              }}>
                {profileSaving ? '저장 중...' : '💾 저장'}
              </button>
            </div>
          )}

          {/* ── 대리 관리자 탭 ── */}
          {tab === 'proxy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 설명 */}
              <div style={{
                padding: '12px 14px', borderRadius: 8, fontSize: '0.82rem',
                background: dk ? '#0f172a' : '#eff6ff',
                border: `1px solid ${dk ? '#334155' : '#bfdbfe'}`,
                color: dk ? '#93c5fd' : '#1d4ed8', lineHeight: 1.6,
              }}>
                지정된 사원은 <strong>사번 / admin1234</strong> 로 로그인하면<br />
                관리자 기능을 대리 수행할 수 있습니다.
              </div>

              {/* 사번 입력 + 추가 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>추가할 사원 사번</label>
                  <input style={inputStyle} type="number" value={proxyInput}
                    onChange={e => setProxyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addProxy()}
                    placeholder="사번 입력 후 Enter" />
                </div>
                <button onClick={addProxy} disabled={proxyLoading || !proxyInput.trim()} style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: proxyLoading || !proxyInput.trim() ? '#e2e8f0' : '#4f46e5',
                  color: proxyLoading || !proxyInput.trim() ? '#9ca3af' : '#fff',
                  fontWeight: 700, fontSize: '0.85rem',
                  cursor: proxyLoading || !proxyInput.trim() ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  {proxyLoading ? '추가 중...' : '+ 추가'}
                </button>
              </div>

              {/* 직원 목록 (빠른 선택) */}
              {emps.length > 0 && (
                <div>
                  <label style={labelStyle}>직원 목록에서 선택 (클릭 시 사번 자동 입력)</label>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    maxHeight: 120, overflowY: 'auto',
                    padding: 8, borderRadius: 8,
                    background: dk ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${C.inputBd}`,
                  }}>
                    {emps.map(emp => {
                      const isProxy = proxies.some(p => Number(p.empno) === emp.empno);
                      return (
                        <span
                          key={emp.empno}
                          onClick={() => !isProxy && setProxyInput(String(emp.empno))}
                          style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem',
                            fontWeight: 600, cursor: isProxy ? 'default' : 'pointer',
                            background: isProxy
                              ? (dk ? '#1e3a2c' : '#dcfce7')
                              : (dk ? '#1e293b' : '#f1f5f9'),
                            color: isProxy ? '#16a34a' : C.text,
                            border: `1px solid ${isProxy ? '#bbf7d0' : C.border}`,
                            transition: 'all 0.15s',
                          }}
                          title={isProxy ? '이미 대리 관리자' : `${emp.empno}번 선택`}
                        >
                          {emp.ename} {isProxy ? '✓' : `(${emp.empno})`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {proxyMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                  background: proxyMsg.startsWith('✅') ? '#dcfce7' : '#fef2f2',
                  color:      proxyMsg.startsWith('✅') ? '#15803d' : '#dc2626',
                }}>{proxyMsg}</div>
              )}

              {/* 현재 대리 관리자 목록 */}
              <div>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 700, color: C.sub,
                  marginBottom: 8,
                }}>
                  현재 대리 관리자 ({proxies.length}명)
                </div>
                {proxies.length === 0 ? (
                  <div style={{
                    padding: '20px', textAlign: 'center', fontSize: '0.82rem',
                    color: C.sub, borderRadius: 8,
                    background: dk ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${C.border}`,
                  }}>
                    지정된 대리 관리자가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {proxies.map(p => (
                      <div key={p.empno} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8,
                        background: dk ? '#0f172a' : '#f8fafc',
                        border: `1px solid ${C.border}`,
                      }}>
                        {/* 아바타 */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>{String(p.ename || '?').charAt(0)}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.text }}>
                            {p.ename || '(이름 없음)'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: C.sub }}>
                            사번 {p.empno} · 로그인: {p.empno} / admin1234
                          </div>
                        </div>

                        <button
                          onClick={() => removeProxy(p.empno, p.ename || p.empno)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none',
                            background: '#fef2f2', color: '#ef4444',
                            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                            flexShrink: 0,
                          }}>해제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
