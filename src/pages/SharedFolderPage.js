import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFiles, fetchAdminFiles, uploadFile, downloadFile, deleteFile, fetchR2Status } from '../api/fileApi';
import { fetchDepts } from '../api/deptApi';

// ── 파일 확장자 → 이모지 아이콘 ──
const fileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) return '🖼️';
  if (ext === 'pdf')                                                return '📄';
  if (['xlsx','xls','csv'].includes(ext))                          return '📊';
  if (['docx','doc'].includes(ext))                                return '📝';
  if (['pptx','ppt'].includes(ext))                                return '📽️';
  if (['zip','rar','7z','tar','gz'].includes(ext))                 return '🗜️';
  if (['mp4','mov','avi','mkv'].includes(ext))                     return '🎬';
  if (['mp3','wav','aac'].includes(ext))                           return '🎵';
  return '📎';
};

const fmtSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes >= 1024)        return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
};

/**
 * Props:
 *   isAdmin  {boolean}  관리자 여부
 *   empno    {number}   사원 번호 (사원 전용)
 *   darkMode {boolean}
 */
export default function SharedFolderPage({ isAdmin = false, empno = null, darkMode = false }) {
  const dk = darkMode;
  const C = {
    bg:      dk ? '#0f172a' : '#f3f4f6',
    card:    dk ? '#1e293b' : '#ffffff',
    border:  dk ? '#334155' : '#e5e7eb',
    text:    dk ? '#e2e8f0' : '#374151',
    muted:   dk ? '#94a3b8' : '#6b7280',
    dark:    dk ? '#f1f5f9' : '#1f2937',
    subBg:   dk ? '#0f172a' : '#f9fafb',
    hover:   dk ? '#1e293b' : '#f3f4f6',
  };

  // ── 탭: ALL | DEPT ──
  const [tab,        setTab]        = useState('ALL');
  const [files,      setFiles]      = useState([]);
  const [loading,    setLoading]    = useState(false);

  // 관리자 전용 부서 필터
  const [depts,      setDepts]      = useState([]);
  const [adminDept,  setAdminDept]  = useState(null);  // deptno 또는 null

  // 업로드 패널
  const [showUpload,  setShowUpload]  = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [pendingFiles,setPendingFiles]= useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [uploadScope, setUploadScope] = useState('ALL');
  const [uploadDept,  setUploadDept]  = useState(null);

  // R2 상태
  const [r2Ready,    setR2Ready]    = useState(true);


  // ── R2 준비 여부 확인 ──
  useEffect(() => {
    fetchR2Status()
      .then(d => setR2Ready(d.ready))
      .catch(() => setR2Ready(false));
  }, []);

  // ── 부서 목록 (관리자용) ──
  useEffect(() => {
    if (isAdmin) {
      fetchDepts().then(setDepts).catch(() => {});
    }
  }, [isAdmin]);

  // ── 파일 목록 로드 ──
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (isAdmin) {
        // 관리자: scope + deptno 필터
        const scope = tab === 'DEPT' ? 'DEPT' : 'ALL';
        data = await fetchAdminFiles(scope, tab === 'DEPT' ? adminDept : null);
      } else {
        data = await fetchFiles(tab);
      }
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [tab, isAdmin, adminDept]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // 탭 전환 시 업로드 스코프 동기화
  useEffect(() => {
    setUploadScope(tab);
    setUploadDept(adminDept);
  }, [tab, adminDept]);

  // ── 업로드 처리 ──
  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    if (!r2Ready) { alert('R2 자격증명이 설정되지 않았습니다.'); return; }
    setUploading(true);
    try {
      for (const f of pendingFiles) {
        const actualDept = uploadScope === 'DEPT' ? (uploadDept ?? adminDept) : null;
        const res = await uploadFile(f, uploadScope, actualDept);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || '업로드 실패');
        }
      }
      setPendingFiles([]);
      setShowUpload(false);
      loadFiles();
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const fallbackInputRef = useRef();

  const onFilePick = (e) => {
    setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  // File System Access API — 확장프로그램 우회, 브라우저 네이티브 파일 선택창
  const handleBrowseFiles = async () => {
    try {
      if (typeof window.showOpenFilePicker === 'function') {
        const handles = await window.showOpenFilePicker({ multiple: true });
        const files   = await Promise.all(handles.map(h => h.getFile()));
        setPendingFiles(prev => [...prev, ...files]);
      } else {
        fallbackInputRef.current?.click(); // 구형 브라우저 폴백
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('파일 선택 오류: ' + e.message);
    }
  };

  // ── 다운로드 ──
  const handleDownload = async (fileId, fileName) => {
    try { await downloadFile(fileId, fileName); }
    catch (e) { alert('다운로드 실패: ' + e.message); }
  };

  // ── 삭제 ──
  const handleDelete = async (fileId, uploaderKey) => {
    if (!window.confirm('이 파일을 삭제할까요?')) return;
    try {
      const res = await deleteFile(fileId);
      if (!res.ok) throw new Error('삭제 실패');
      loadFiles();
    } catch (e) { alert(e.message); }
  };

  // ── 스타일 ──
  const tabBtn = (active) => ({
    padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontWeight: active ? 700 : 400, fontSize: '0.88rem',
    background: active ? '#4f46e5' : (dk ? '#1e293b' : '#f1f5f9'),
    color:      active ? '#fff'    : C.muted,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: C.dark }}>📁 공유 폴더</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: C.muted }}>
            전체 공유 / 부서별 공유 파일 관리
          </p>
        </div>
        <button
          onClick={() => { setShowUpload(s => !s); setPendingFiles([]); }}
          style={{
            background: '#4f46e5', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ＋ 파일 올리기
        </button>
      </div>

      {/* ── R2 미설정 경고 ── */}
      {!r2Ready && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20, color: '#92400e', fontSize: '0.85rem',
        }}>
          ⚠️ Cloudflare R2 자격증명이 설정되지 않았습니다.
          EB 환경변수 <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY</code>, <code>R2_SECRET_KEY</code>를 등록하세요.
        </div>
      )}

      {/* ── 업로드 패널 ── */}
      {showUpload && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <h4 style={{ margin: '0 0 16px', color: C.dark, fontSize: '1rem' }}>📤 파일 업로드</h4>

          {/* 스코프 선택 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.83rem', color: C.muted, minWidth: 60 }}>저장 위치</span>
            {['ALL', 'DEPT'].map(s => (
              <button key={s} onClick={() => setUploadScope(s)}
                style={{
                  padding: '6px 14px', border: `1px solid ${uploadScope === s ? '#4f46e5' : C.border}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem',
                  background: uploadScope === s ? '#ede9fe' : C.card,
                  color: uploadScope === s ? '#4f46e5' : C.text, fontWeight: uploadScope === s ? 700 : 400,
                }}>
                {s === 'ALL' ? '📂 전체 공유' : '🏢 부서 공유'}
              </button>
            ))}

            {/* 부서 선택 (DEPT + 관리자) */}
            {uploadScope === 'DEPT' && isAdmin && (
              <select
                value={uploadDept ?? ''}
                onChange={e => setUploadDept(e.target.value ? Number(e.target.value) : null)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.card, color: C.text, fontSize: '0.82rem',
                }}
              >
                <option value="">부서 선택</option>
                {depts.map(d => (
                  <option key={d.deptno} value={d.deptno}>{d.dname}</option>
                ))}
              </select>
            )}
          </div>

          {/* 드래그존 (드래그 전용) + 파일선택 버튼 분리 */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
            }}
            style={{
              border: `2px dashed ${dragOver ? '#4f46e5' : C.border}`,
              borderRadius: 10, padding: '20px', textAlign: 'center',
              background: dragOver ? '#ede9fe' : C.subBg,
              transition: 'all 0.2s', marginBottom: 12,
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 6 }}>🗂️</div>
            <div style={{ fontSize: '0.85rem', color: C.muted }}>여기에 파일을 드래그하세요</div>
            <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 4 }}>최대 50MB</div>
          </div>

          {/* 파일 선택 버튼 — File System Access API (확장프로그램 우회) */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <button
              type="button"
              onClick={handleBrowseFiles}
              style={{
                background: '#f1f5f9', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '9px 24px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5',
              }}
            >
              📁 파일 선택하기
            </button>
            {/* 구형 브라우저 폴백 input */}
            <input ref={fallbackInputRef} type="file" multiple onChange={onFilePick} style={{ display: 'none' }} />
          </div>

          {/* 선택된 파일 목록 */}
          {pendingFiles.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', background: C.subBg, borderRadius: 8, marginBottom: 4,
                  fontSize: '0.82rem', color: C.text,
                }}>
                  <span>{fileIcon(f.name)} {f.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.muted }}>{fmtSize(f.size)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter((_, j) => j !== i)); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem' }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowUpload(false); setPendingFiles([]); }}
              style={{ padding: '9px 18px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer', fontSize: '0.85rem' }}>
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !pendingFiles.length}
              style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: uploading || !pendingFiles.length ? '#e5e7eb' : '#4f46e5',
                color: uploading || !pendingFiles.length ? '#9ca3af' : '#fff',
                cursor: uploading || !pendingFiles.length ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.85rem',
              }}>
              {uploading ? '업로드 중...' : `업로드 (${pendingFiles.length}개)`}
            </button>
          </div>
        </div>
      )}

      {/* ── 탭 + 부서 필터 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => { setTab('ALL'); setAdminDept(null); }} style={tabBtn(tab === 'ALL')}>
          📂 전체 공유
        </button>
        <button onClick={() => setTab('DEPT')} style={tabBtn(tab === 'DEPT')}>
          🏢 부서 공유
        </button>

        {/* 관리자: 부서 선택 드롭다운 */}
        {isAdmin && tab === 'DEPT' && (
          <select
            value={adminDept ?? ''}
            onChange={e => setAdminDept(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: '0.85rem', marginLeft: 6,
            }}
          >
            <option value="">전체 부서</option>
            {depts.map(d => (
              <option key={d.deptno} value={d.deptno}>{d.dname}</option>
            ))}
          </select>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: C.muted }}>
          {files.length}개 파일
        </span>
      </div>

      {/* ── 파일 목록 ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: C.muted }}>
            불러오는 중...
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '56px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <div style={{ color: C.muted, fontSize: '0.9rem' }}>
              {tab === 'ALL' ? '전체 공유 파일이 없습니다' : '부서 공유 파일이 없습니다'}
            </div>
            <div style={{ color: C.muted, fontSize: '0.8rem', marginTop: 6 }}>
              "파일 올리기" 버튼으로 첫 번째 파일을 올려보세요
            </div>
          </div>
        ) : (
          <>
            {/* 파일 카드 목록 */}
            {files.map((f, idx) => (
              <div key={f.fileId} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: idx < files.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = (dk ? '#243347' : '#f8fafc')}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* 파일 아이콘 */}
                <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{fileIcon(f.fileName)}</span>

                {/* 파일 정보 (남은 공간 전체 사용) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 파일명 — 전체 너비 사용, 긴 이름은 두 줄까지 허용 */}
                  <div style={{
                    fontWeight: 700, fontSize: '0.92rem', color: C.dark,
                    wordBreak: 'break-all', lineHeight: 1.4,
                  }}>
                    {f.fileName}
                  </div>
                  {/* 부서 뱃지 (관리자 + 부서 파일) */}
                  {isAdmin && f.scope === 'DEPT' && f.dname && (
                    <span style={{
                      display: 'inline-block', marginTop: 3,
                      fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8',
                      padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                    }}>{f.dname}</span>
                  )}
                  {/* 크기 · 올린 사람 · 날짜 */}
                  <div style={{
                    marginTop: 4, fontSize: '0.78rem', color: C.muted,
                    display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{fmtSize(f.fileSize)}</span>
                    <span>·</span>
                    <span>👤 {f.uploaderName || f.uploader}</span>
                    <span>·</span>
                    <span>{f.createdAt}</span>
                  </div>
                </div>

                {/* 관리 버튼 */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDownload(f.fileId, f.fileName)}
                    title="다운로드"
                    style={{
                      padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.card, cursor: 'pointer', fontSize: '0.85rem',
                      color: '#4f46e5', fontWeight: 700,
                    }}>⬇</button>
                  {(isAdmin || f.uploader === String(empno)) && (
                    <button
                      onClick={() => handleDelete(f.fileId, f.uploader)}
                      title="삭제"
                      style={{
                        padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5',
                        background: C.card, cursor: 'pointer', fontSize: '0.85rem',
                        color: '#ef4444', fontWeight: 700,
                      }}>🗑</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
