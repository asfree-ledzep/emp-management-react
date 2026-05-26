import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/apiClient';

// 시도 목록
const SIDO_LIST = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종',
];

/**
 * 미세먼지 위젯
 * props:
 *   darkMode  - boolean
 *   compact   - boolean (좁은 공간용 축소 모드)
 *   defaultSido - string (기본 시도, 미지정 시 '서울')
 */
export default function DustWidget({ darkMode = false, compact = false, defaultSido = '서울' }) {
  const [dust,    setDust]    = useState(null);
  const [sido,    setSido]    = useState(defaultSido);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastAt,  setLastAt]  = useState(null);

  const dk = darkMode;

  const fetchDust = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch(`/api/dust?sido=${encodeURIComponent(sido)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'API_FORBIDDEN') {
          throw new Error('API_FORBIDDEN');
        }
        if (d.error) throw new Error(d.message || d.error);
        setDust(d);
        setLastAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sido]);

  useEffect(() => {
    fetchDust();
    const t = setInterval(fetchDust, 30 * 60 * 1000); // 30분마다 갱신
    return () => clearInterval(t);
  }, [fetchDust]);

  // 등급별 색상
  const gradeColor = (grade) => {
    if (grade === 1) return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#3b82f6' };
    if (grade === 2) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#22c55e' };
    if (grade === 3) return { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badge: '#f97316' };
    if (grade === 4) return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', badge: '#ef4444' };
    return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', badge: '#94a3b8' };
  };

  // 대표 등급 (더 나쁜 쪽)
  const worstGrade = dust ? Math.max(dust.pm10Grade || 0, dust.pm25Grade || 0) : 0;
  const wc = gradeColor(worstGrade);

  // 다크 배경
  const cardBg = dk
    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    : `linear-gradient(135deg, ${wc.bg} 0%, #f8fafc 100%)`;
  const cardBorder = dk ? '#334155' : wc.border;
  const textMuted = dk ? '#94a3b8' : '#64748b';
  const textDark  = dk ? '#f1f5f9' : '#1e293b';

  return (
    <div style={{ marginBottom: compact ? 8 : 12 }}>

      {/* ── 재택 추천 배너 (나쁨 이상) ── */}
      {dust?.wfh && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
          border: '1.5px solid #f97316',
          borderRadius: 12, padding: '10px 16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 2px 10px rgba(249,115,22,0.15)',
        }}>
          <span style={{ fontSize: '1.4rem' }}>😷</span>
          <div>
            <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.88rem' }}>
              대기질이 나쁩니다 — 외출 시 마스크 착용 권장
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: 2 }}>
              {dust.wfhReasons.join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* ── 메인 카드 ── */}
      <div style={{
        background: cardBg,
        border: `1.5px solid ${cardBorder}`,
        borderRadius: 12,
        padding: compact ? '10px 14px' : '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>

        {/* 왼쪽: 아이콘 + 제목 + 시도 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: compact ? '1.6rem' : '2rem', lineHeight: 1 }}>
            {loading ? '🔄' : (dust?.pm10Grade >= 4 || dust?.pm25Grade >= 4) ? '🚨'
              : (dust?.pm10Grade >= 3 || dust?.pm25Grade >= 3) ? '😷' : '🌬️'}
          </span>
          <div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginBottom: 2 }}>
              실시간 대기질
            </div>
            {/* 시도 선택 드롭다운 */}
            <select
              value={sido}
              onChange={e => setSido(e.target.value)}
              style={{
                fontSize: '0.8rem', fontWeight: 700, color: textDark,
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, outline: 'none', appearance: 'none',
              }}
            >
              {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, height: 36, background: cardBorder, flexShrink: 0 }} />

        {/* PM10 */}
        {loading ? (
          <div style={{ color: textMuted, fontSize: '0.82rem' }}>조회 중...</div>
        ) : error === 'API_FORBIDDEN' ? (
          <div style={{ fontSize: '0.78rem', color: textMuted, lineHeight: 1.5 }}>
            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 3 }}>🔑 API 미인증</div>
            <div>공공데이터포털에서</div>
            <div style={{ fontWeight: 600, color: textDark }}>에어코리아 대기오염정보</div>
            <div>API 신청 후 키 등록 필요</div>
          </div>
        ) : error ? (
          <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>⚠ {error}</div>
        ) : dust && (
          <>
            <DustItem
              label="미세먼지 PM₁₀"
              value={dust.pm10 >= 0 ? dust.pm10 : '-'}
              unit="㎍/㎥"
              grade={dust.pm10Grade}
              label2={dust.pm10Label}
              emoji={dust.pm10Emoji}
              color={gradeColor(dust.pm10Grade)}
              dk={dk}
            />

            <div style={{ width: 1, height: 30, background: cardBorder, flexShrink: 0 }} />

            <DustItem
              label="초미세먼지 PM₂.₅"
              value={dust.pm25 >= 0 ? dust.pm25 : '-'}
              unit="㎍/㎥"
              grade={dust.pm25Grade}
              label2={dust.pm25Label}
              emoji={dust.pm25Emoji}
              color={gradeColor(dust.pm25Grade)}
              dk={dk}
            />

            {/* KHAI (통합대기환경지수) - compact가 아닐 때만 */}
            {!compact && dust.khai >= 0 && (
              <>
                <div style={{ width: 1, height: 30, background: cardBorder, flexShrink: 0 }} />
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{
                    fontSize: '1.1rem', fontWeight: 800,
                    color: gradeColor(dust.khaiGrade).badge,
                  }}>
                    {dust.khai}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, marginTop: 2 }}>통합대기</div>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: gradeColor(dust.khaiGrade).badge, marginTop: 1,
                  }}>
                    {dust.khaiLabel}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* 오른쪽: 측정 정보 + 새로고침 */}
        <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.7rem', color: textMuted }}>
            <button
              onClick={fetchDust}
              disabled={loading}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: textMuted, fontSize: '0.7rem', padding: '2px 4px',
                borderRadius: 4, transition: 'background 0.15s',
              }}
              title="새로고침"
            >
              🔄 {loading ? '...' : '새로고침'}
            </button>
          </div>
          {dust?.station && (
            <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: 2 }}>
              📍 {dust.station} 측정소
            </div>
          )}
          {lastAt && (
            <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: 1 }}>
              {lastAt} 조회
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** PM10 / PM2.5 개별 항목 */
function DustItem({ label, value, unit, grade, label2, emoji, color, dk }) {
  const textMuted = dk ? '#94a3b8' : '#64748b';
  return (
    <div style={{ textAlign: 'center', minWidth: 72 }}>
      {/* 수치 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: color.badge, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: '0.65rem', color: textMuted }}>{unit}</span>
      </div>
      {/* 등급 배지 */}
      <div style={{
        display: 'inline-block',
        background: color.badge, color: '#fff',
        fontSize: '0.65rem', fontWeight: 700,
        borderRadius: 9999, padding: '1px 7px', marginTop: 3,
      }}>
        {emoji} {label2}
      </div>
      {/* 라벨 */}
      <div style={{ fontSize: '0.65rem', color: textMuted, marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}
