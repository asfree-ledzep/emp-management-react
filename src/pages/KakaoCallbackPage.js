import React, { useEffect, useState } from 'react';
import { connectKakao } from '../api/noticeApi';

function KakaoCallbackPage() {
  const [status, setStatus] = useState('카카오 연동 처리 중...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('❌ 카카오 로그인이 취소되었습니다.');
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }

    if (!code) {
      setStatus('❌ 인증 코드가 없습니다.');
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }

    connectKakao(code)
      .then(res => {
        if (res.ok) {
          setStatus('✅ 카카오 연동 완료! 잠시 후 이동합니다.');
        } else {
          setStatus('❌ 카카오 연동 실패. 다시 시도해주세요.');
        }
        setTimeout(() => { window.location.href = '/'; }, 2000);
      })
      .catch(() => {
        setStatus('❌ 오류가 발생했습니다.');
        setTimeout(() => { window.location.href = '/'; }, 2000);
      });
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      height: '100vh', gap: '16px'
    }}>
      <div style={{ fontSize: '2rem' }}>🔗</div>
      <p style={{ fontSize: '1.1rem', color: '#374151' }}>{status}</p>
    </div>
  );
}

export default KakaoCallbackPage;
