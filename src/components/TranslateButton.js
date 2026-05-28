import React, { useState } from 'react';
import { translateText } from '../api/translateApi';

const LANGS = [
  { code: 'en',    label: '🇺🇸 영어'  },
  { code: 'zh-CN', label: '🇨🇳 중국어' },
  { code: 'ja',    label: '🇯🇵 일본어' },
];

/**
 * 번역 버튼 컴포넌트
 *
 * props:
 *   text     - 번역할 원문 텍스트
 *   darkMode - boolean
 *   style    - 외부 스타일 오버라이드
 */
export default function TranslateButton({ text, darkMode = false, style = {} }) {
  const dk = darkMode;

  const [selectedLang,    setSelectedLang]    = useState('en');
  const [translatedText,  setTranslatedText]  = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [open,            setOpen]            = useState(false); // 번역 패널 열림

  const border  = dk ? '#334155' : '#e2e8f0';
  const textM   = dk ? '#94a3b8' : '#64748b';
  const textD   = dk ? '#e2e8f0' : '#1e293b';
  const panelBg = dk ? '#0f172a' : '#f8fafc';

  const handleTranslate = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    setError(null);
    setTranslatedText(null);
    try {
      const data = await translateText(text, selectedLang);
      if (data.error) {
        setError(data.message || data.error);
      } else {
        setTranslatedText(data.translatedText);
        setOpen(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTranslatedText(null);
    setError(null);
  };

  return (
    <div style={{ ...style }}>
      {/* 언어 선택 + 번역 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: textM, flexShrink: 0 }}>🌐 번역:</span>
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => {
              setSelectedLang(l.code);
              setTranslatedText(null);
              setError(null);
              setOpen(false);
            }}
            style={{
              padding: '3px 10px', borderRadius: 20, border: 'none',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              background: selectedLang === l.code
                ? '#4f46e5'
                : (dk ? '#1e293b' : '#f1f5f9'),
              color: selectedLang === l.code ? '#fff' : textM,
              transition: 'all 0.15s',
            }}
          >
            {l.label}
          </button>
        ))}
        <button
          onClick={handleTranslate}
          disabled={loading || !text?.trim()}
          style={{
            padding: '3px 14px', borderRadius: 20,
            border: 'none', fontSize: '0.72rem', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            background: loading ? '#94a3b8' : '#0891b2',
            color: '#fff',
            opacity: !text?.trim() ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          {loading ? '번역 중...' : '번역하기'}
        </button>
        {(open || error) && (
          <button
            onClick={handleClose}
            style={{
              padding: '3px 10px', borderRadius: 20, border: `1px solid ${border}`,
              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              background: 'none', color: textM,
            }}
          >
            ✕ 닫기
          </button>
        )}
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: dk ? '#1c1917' : '#fef3c7',
          border: `1px solid ${dk ? '#713f12' : '#fcd34d'}`,
          fontSize: '0.78rem', color: '#92400e',
        }}>
          ⚠️ {error === 'API_FORBIDDEN'
            ? '파파고 API 미설정 — 네이버 앱에 "파파고 NMT 번역" 추가 필요'
            : error}
        </div>
      )}

      {/* 번역 결과 */}
      {open && translatedText && (
        <div style={{
          marginTop: 10, padding: '14px 16px', borderRadius: 10,
          background: panelBg, border: `1.5px solid ${border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0891b2' }}>
              {LANGS.find(l => l.code === selectedLang)?.label} 번역
            </span>
            <div style={{ flex: 1, height: 1, background: border }} />
          </div>
          <div style={{
            fontSize: '0.85rem', color: textD,
            lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {translatedText}
          </div>
        </div>
      )}
    </div>
  );
}
