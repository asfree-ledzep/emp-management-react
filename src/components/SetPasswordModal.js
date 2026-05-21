import React, { useState } from 'react';
import { setEmpPassword } from '../api/authApi';
import '../styles/Modal.css';
import '../styles/Button.css';

// 관리자가 사원 비밀번호를 설정/재설정하는 모달
// props:
//   emp     - 대상 사원 { empno, ename }
//   onClose - 닫기 콜백
const SetPasswordModal = ({ emp, onClose }) => {
  const [password, setPassword]     = useState('');
  const [confirm,  setConfirm]      = useState('');
  const [saving,   setSaving]       = useState(false);
  const [error,    setError]        = useState('');
  const [success,  setSuccess]      = useState(false);

  const handleSave = async () => {
    setError('');
    if (password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await setEmpPassword(emp.empno, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 비밀번호 설정</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 16, color: '#6b7280', fontSize: '0.9rem' }}>
            사원번호 <strong style={{ color: '#111827' }}>{emp.empno}</strong>
            {' '}/ <strong style={{ color: '#111827' }}>{emp.ename}</strong>
          </p>

          {success ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 8, padding: '16px', textAlign: 'center',
              color: '#16a34a', fontWeight: 600
            }}>
              ✅ 비밀번호가 설정되었습니다.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">새 비밀번호</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="4자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">비밀번호 확인</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="비밀번호 재입력"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 14px',
                  color: '#dc2626', fontSize: '0.875rem', marginTop: 4
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          <div className="modal-footer" style={{ marginTop: 20 }}>
            {!success && (
              <button className="btn btn-blue" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            )}
            <button className="btn btn-gray" onClick={onClose}>
              {success ? '닫기' : '취소'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordModal;
