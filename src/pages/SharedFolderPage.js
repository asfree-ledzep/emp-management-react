import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchFiles, fetchAdminFiles, uploadFile, downloadFile, deleteFile, fetchR2Status,
  fetchFolders, createFolder, renameFolder, deleteFolder,
} from '../api/fileApi';
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
    bg:     dk ? '#0f172a' : '#f3f4f6',
    card:   dk ? '#1e293b' : '#ffffff',
    border: dk ? '#334155' : '#e5e7eb',
    text:   dk ? '#e2e8f0' : '#374151',
    muted:  dk ? '#94a3b8' : '#6b7280',
    dark:   dk ? '#f1f5f9' : '#1f2937',
    subBg:  dk ? '#0f172a' : '#f9fafb',
    folderBg: dk ? '#1e3a5f' : '#eff6ff',
    folderBorder: dk ? '#2563eb' : '#bfdbfe',
  };

  // ── 탭: ALL | DEPT ──
  const [tab,       setTab]       = useState('ALL');
  const [files,     setFiles]     = useState([]);
  const [folders,   setFolders]   = useState([]);
  const [loading,   setLoading]   = useState(false);

  // ── 폴더 탐색 상태 ──
  // folderPath: [{ id, name }, ...] — 브레드크럼용
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath,      setFolderPath]      = useState([]); // [{id, name}]

  // 관리자 전용 부서 필터
  const [depts,     setDepts]     = useState([]);
  const [adminDept, setAdminDept] = useState(null);

  // 폴더 생성 UI
  const [showNewFolder,   setShowNewFolder]   = useState(false);
  const [newFolderName,   setNewFolderName]   = useState('');
  const [creatingFolder,  setCreatingFolder]  = useState(false);

  // 폴더 이름 변경 UI
  const [renamingId,   setRenamingId]   = useState(null);
  const [renameValue,  setRenameValue]  = useState('');

  // 업로드 패널
  const [showUpload,   setShowUpload]   = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadScope,  setUploadScope]  = useState('ALL');
  const [uploadDept,   setUploadDept]   = useState(null);

  // R2 상태
  const [r2Ready, setR2Ready] = useState(true);

  // ── R2 준비 여부 확인 ──
  useEffect(() => {
    fetchR2Status()
      .then(d => setR2Ready(d.ready))
      .catch(() => setR2Ready(false));
  }, []);

  // ── 부서 목록 (관리자용) ──
  useEffect(() => {
    if (isAdmin) fetchDepts().then(setDepts).catch(() => {});
  }, [isAdmin]);

  // ── 현재 위치의 폴더 + 파일 로드 ──
  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const scope     = tab === 'DEPT' ? 'DEPT' : 'ALL';
      const deptno    = tab === 'DEPT' ? adminDept : null;
      const folderId  = currentFolderId;

      // 폴더 목록
      const folderData = await fetchFolders(scope, deptno, folderId).catch(() => []);
      setFolders(Array.isArray(folderData) ? folderData : []);

      // 파일 목록
      let fileData;
      if (isAdmin) {
        fileData = await fetchAdminFiles(scope, deptno, folderId);
      } else {
        fileData = await fetchFiles(scope, folderId);
      }
      setFiles(Array.isArray(fileData) ? fileData : []);
    } catch {
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [tab, isAdmin, adminDept, currentFolderId]);

  useEffect(() => { loadContents(); }, [loadContents]);

  // 탭 전환 시 폴더 경로 초기화
  useEffect(() => {
    setCurrentFolderId(null);
    setFolderPath([]);
    setUploadScope(tab);
    setUploadDept(adminDept);
  }, [tab, adminDept]);

  // ── 폴더 진입 ──
  const enterFolder = (folder) => {
    setCurrentFolderId(folder.folderId);
    setFolderPath(prev => [...prev, { id: folder.folderId, name: folder.folderName }]);
    setShowNewFolder(false);
  };

  // ── 브레드크럼 이동 ──
  const navigateTo = (idx) => {
    if (idx < 0) {
      // 루트로
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const target = folderPath[idx];
      setCurrentFolderId(target.id);
      setFolderPath(folderPath.slice(0, idx + 1));
    }
    setShowNewFolder(false);
  };

  // ── 폴더 생성 ──
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const scope  = tab === 'DEPT' ? 'DEPT' : 'ALL';
      const deptno = tab === 'DEPT' ? adminDept : null;
      const res = await createFolder(newFolderName.trim(), scope, deptno, currentFolderId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '폴더 생성 실패');
      }
      setNewFolderName('');
      setShowNewFolder(false);
      loadContents();
    } catch (e) { alert(e.message); }
    finally { setCreatingFolder(false); }
  };

  // ── 폴더 이름 변경 ──
  const handleRename = async (folderId) => {
    if (!renameValue.trim()) return;
    try {
      const res = await renameFolder(folderId, renameValue.trim());
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || '변경 실패'); }
      setRenamingId(null);
      loadContents();
    } catch (e) { alert(e.message); }
  };

  // ── 폴더 삭제 ──
  const handleDeleteFolder = async (folder) => {
    const hasContent = (folder.fileCount > 0) || (folder.subFolderCount > 0);
    const msg = hasContent
      ? `"${folder.folderName}" 안의 파일 ${folder.fileCount}개가 루트로 이동되고 폴더가 삭제됩니다. 계속할까요?`
      : `"${folder.folderName}" 폴더를 삭제할까요?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await deleteFolder(folder.folderId);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || '삭제 실패'); }
      loadContents();
    } catch (e) { alert(e.message); }
  };

  // ── 파일 업로드 ──
  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    if (!r2Ready) { alert('R2 자격증명이 설정되지 않았습니다.'); return; }
    setUploading(true);
    try {
      for (const f of pendingFiles) {
        const actualDept = uploadScope === 'DEPT' ? (uploadDept ?? adminDept) : null;
        const res = await uploadFile(f, uploadScope, actualDept, currentFolderId);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || '업로드 실패');
        }
      }
      setPendingFiles([]);
      setShowUpload(false);
      loadContents();
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  };

  // ── 파일 선택 (Grabbit 확장 프로그램 우회) ──
  // 전략: 투명 <input> overlay → 사용자가 직접 클릭 (JS 클릭 없음)
  //        + window.focus 이벤트로 el.files 직접 읽기 (change 이벤트 완전 우회)
  const nativeInputRef = useRef();

  useEffect(() => {
    const el = nativeInputRef.current;
    if (!el) return;
    const onFocus = () => {
      setTimeout(() => {
        if (el.files && el.files.length > 0) {
          setPendingFiles(prev => [...prev, ...Array.from(el.files)]);
          try { el.value = ''; } catch (_) {}
        }
      }, 150);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ── 파일 다운로드 / 삭제 ──
  const handleDownload = async (fileId, fileName) => {
    try { await downloadFile(fileId, fileName); }
    catch (e) { alert('다운로드 실패: ' + e.message); }
  };
  const handleDelete = async (fileId) => {
    if (!window.confirm('이 파일을 삭제할까요?')) return;
    try {
      const res = await deleteFile(fileId);
      if (!res.ok) throw new Error('삭제 실패');
      loadContents();
    } catch (e) { alert(e.message); }
  };

  // ── 공통 스타일 ──
  const tabBtn = (active) => ({
    padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontWeight: active ? 700 : 400, fontSize: '0.88rem',
    background: active ? '#4f46e5' : (dk ? '#1e293b' : '#f1f5f9'),
    color:      active ? '#fff'    : C.muted,
    transition: 'all 0.15s',
  });

  const isEmpty = folders.length === 0 && files.length === 0;

  // ── 브레드크럼 ──
  const Breadcrumb = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: '0.83rem', color: C.muted, flexWrap: 'wrap',
      marginBottom: 14,
    }}>
      <span
        onClick={() => navigateTo(-1)}
        style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 600 }}
      >
        🏠 루트
      </span>
      {folderPath.map((seg, i) => (
        <React.Fragment key={seg.id}>
          <span style={{ color: C.border }}>›</span>
          <span
            onClick={() => navigateTo(i)}
            style={{
              cursor: i < folderPath.length - 1 ? 'pointer' : 'default',
              color:  i < folderPath.length - 1 ? '#4f46e5' : C.dark,
              fontWeight: i === folderPath.length - 1 ? 700 : 400,
            }}
          >
            {seg.name}
          </span>
        </React.Fragment>
      ))}
    </div>
  );

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
          <h4 style={{ margin: '0 0 4px', color: C.dark, fontSize: '1rem' }}>📤 파일 업로드</h4>
          {currentFolderId && (
            <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#4f46e5' }}>
              📂 현재 폴더에 업로드됩니다: <strong>{folderPath[folderPath.length - 1]?.name}</strong>
            </p>
          )}

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
                {depts.map(d => <option key={d.deptno} value={d.deptno}>{d.dname}</option>)}
              </select>
            )}
          </div>

          {/* 드래그존 + Ctrl+V 붙여넣기 */}
          <div
            tabIndex={0}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
            }}
            onPaste={e => {
              // Windows 탐색기에서 Ctrl+C 한 파일을 Ctrl+V로 붙여넣기
              const files = Array.from(e.clipboardData?.files || []);
              if (files.length > 0) {
                e.preventDefault();
                setPendingFiles(prev => [...prev, ...files]);
              }
            }}
            style={{
              border: `2px dashed ${dragOver ? '#4f46e5' : C.border}`,
              borderRadius: 10, padding: '20px', textAlign: 'center',
              background: dragOver ? '#ede9fe' : C.subBg,
              transition: 'all 0.2s', marginBottom: 12,
              outline: 'none',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 4 }}>🗂️</div>
            <div style={{ fontSize: '0.85rem', color: C.muted }}>파일을 드래그하거나</div>
            <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: 3 }}>
              탐색기에서 파일 복사 후 이 영역 클릭 → <kbd style={{ background: C.card, padding: '1px 5px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: '0.75rem' }}>Ctrl+V</kbd>
            </div>
            <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 4 }}>최대 50MB</div>
          </div>

          {/* 파일 선택 버튼 — 투명 input이 버튼 위를 덮음 (Grabbit 우회) */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* 눈에 보이는 버튼 텍스트 */}
              <div style={{
                background: '#f1f5f9', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '9px 24px',
                fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5',
                userSelect: 'none', pointerEvents: 'none',
              }}>
                📁 파일 선택하기
              </div>
              {/* 투명 input: 사용자 클릭이 직접 전달 → OS 파일 다이얼로그 오픈
                  window.focus 이벤트로 el.files 읽기 (change 이벤트 불필요) */}
              <input
                ref={nativeInputRef}
                type="file"
                multiple
                style={{
                  position: 'absolute', inset: 0,
                  opacity: 0, cursor: 'pointer',
                  width: '100%', height: '100%',
                }}
              />
            </div>
          </div>

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
                      onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
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
            <button onClick={handleUpload} disabled={uploading || !pendingFiles.length}
              style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: uploading || !pendingFiles.length ? '#e5e7eb' : '#4f46e5',
                color:      uploading || !pendingFiles.length ? '#9ca3af' : '#fff',
                cursor:     uploading || !pendingFiles.length ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.85rem',
              }}>
              {uploading ? '업로드 중...' : `업로드 (${pendingFiles.length}개)`}
            </button>
          </div>
        </div>
      )}

      {/* ── 탭 + 부서 필터 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => { setTab('ALL'); setAdminDept(null); }} style={tabBtn(tab === 'ALL')}>
          📂 전체 공유
        </button>
        <button onClick={() => setTab('DEPT')} style={tabBtn(tab === 'DEPT')}>
          🏢 부서 공유
        </button>

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
            {depts.map(d => <option key={d.deptno} value={d.deptno}>{d.dname}</option>)}
          </select>
        )}

        {/* 폴더 만들기 버튼 */}
        <button
          onClick={() => { setShowNewFolder(s => !s); setNewFolderName(''); }}
          style={{
            marginLeft: 'auto', padding: '8px 16px', border: `1px solid ${C.border}`,
            borderRadius: 8, cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
            background: showNewFolder ? '#ede9fe' : C.card,
            color: showNewFolder ? '#4f46e5' : C.text,
          }}>
          📁 새 폴더
        </button>
      </div>

      {/* ── 새 폴더 입력 ── */}
      {showNewFolder && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '12px 16px', marginBottom: 14,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        }}>
          <span style={{ fontSize: '1.2rem' }}>📁</span>
          <input
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
            placeholder="폴더 이름 입력 후 Enter"
            autoFocus
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.subBg, color: C.dark, fontSize: '0.88rem', outline: 'none',
            }}
          />
          <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: creatingFolder || !newFolderName.trim() ? '#e5e7eb' : '#4f46e5',
              color: creatingFolder || !newFolderName.trim() ? '#9ca3af' : '#fff',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem',
            }}>
            {creatingFolder ? '생성 중...' : '만들기'}
          </button>
          <button onClick={() => setShowNewFolder(false)}
            style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, cursor: 'pointer', fontSize: '0.83rem' }}>
            취소
          </button>
        </div>
      )}

      {/* ── 브레드크럼 ── */}
      {folderPath.length > 0 && <Breadcrumb />}

      {/* ── 파일/폴더 목록 ── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: C.muted }}>불러오는 중...</div>
        ) : isEmpty && folderPath.length === 0 ? (
          <div style={{ padding: '56px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <div style={{ color: C.muted, fontSize: '0.9rem' }}>
              {tab === 'ALL' ? '전체 공유 파일이 없습니다' : '부서 공유 파일이 없습니다'}
            </div>
            <div style={{ color: C.muted, fontSize: '0.8rem', marginTop: 6 }}>
              "파일 올리기" 버튼으로 파일을 올리거나 "새 폴더" 버튼으로 폴더를 만드세요
            </div>
          </div>
        ) : (
          <>
            {/* 상위 폴더로 (루트가 아닐 때) */}
            {folderPath.length > 0 && (
              <div
                onClick={() => navigateTo(folderPath.length - 2)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                  color: C.muted, fontSize: '0.88rem',
                }}
                onMouseEnter={e => e.currentTarget.style.background = (dk ? '#243347' : '#f8fafc')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '1.4rem' }}>⬆️</span>
                <span style={{ fontWeight: 600 }}>상위 폴더로</span>
              </div>
            )}

            {/* ── 폴더 목록 ── */}
            {folders.map((folder, idx) => (
              <div key={folder.folderId} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 20px',
                borderBottom: (idx < folders.length - 1 || files.length > 0) ? `1px solid ${C.border}` : 'none',
                background: C.folderBg,
              }}>
                {/* 폴더 아이콘 + 이름 (클릭으로 진입) */}
                <div
                  onClick={() => setRenamingId(null) || enterFolder(folder)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
                >
                  <span style={{ fontSize: '1.7rem', flexShrink: 0 }}>📁</span>
                  {renamingId === folder.folderId ? (
                    <div style={{ display: 'flex', gap: 6, flex: 1 }} onClick={e => e.stopPropagation()}>
                      <input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(folder.folderId);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        style={{
                          flex: 1, padding: '5px 10px', borderRadius: 6,
                          border: `1px solid #4f46e5`, background: C.card,
                          color: C.dark, fontSize: '0.88rem', outline: 'none',
                        }}
                      />
                      <button onClick={() => handleRename(folder.folderId)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>
                        저장
                      </button>
                      <button onClick={() => setRenamingId(null)}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.muted, cursor: 'pointer', fontSize: '0.82rem' }}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.dark }}>{folder.folderName}</div>
                      <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                        {folder.subFolderCount > 0 && <span>📁 {folder.subFolderCount}개 · </span>}
                        <span>📄 {folder.fileCount}개 파일</span>
                        <span> · {folder.creatorName} · {folder.createdAt}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 폴더 액션 버튼 */}
                {renamingId !== folder.folderId && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingId(folder.folderId); setRenameValue(folder.folderName); }}
                      title="이름 변경"
                      style={{
                        padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
                        background: C.card, cursor: 'pointer', fontSize: '0.82rem', color: C.text,
                      }}>✏️</button>
                    {(isAdmin || folder.creator === String(empno) || folder.creator === 'admin') && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                        title="삭제"
                        style={{
                          padding: '6px 10px', borderRadius: 7, border: '1px solid #fca5a5',
                          background: C.card, cursor: 'pointer', fontSize: '0.82rem', color: '#ef4444',
                        }}>🗑</button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* ── 파일 목록 ── */}
            {files.length === 0 && folders.length > 0 && (
              <div style={{ padding: '28px', textAlign: 'center', color: C.muted, fontSize: '0.85rem', borderTop: `1px solid ${C.border}` }}>
                이 폴더에 파일이 없습니다
              </div>
            )}
            {files.length === 0 && folders.length === 0 && folderPath.length > 0 && (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📂</div>
                <div style={{ color: C.muted, fontSize: '0.88rem' }}>빈 폴더입니다</div>
                <div style={{ color: C.muted, fontSize: '0.8rem', marginTop: 4 }}>파일을 올리거나 새 폴더를 만드세요</div>
              </div>
            )}
            {files.map((f, idx) => (
              <div key={f.fileId} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: idx < files.length - 1 ? `1px solid ${C.border}` : 'none',
                borderTop: idx === 0 && folders.length > 0 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = (dk ? '#243347' : '#f8fafc')}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{fileIcon(f.fileName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: C.dark, wordBreak: 'break-all', lineHeight: 1.4 }}>
                    {f.fileName}
                  </div>
                  {isAdmin && f.scope === 'DEPT' && f.dname && (
                    <span style={{
                      display: 'inline-block', marginTop: 3,
                      fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8',
                      padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                    }}>{f.dname}</span>
                  )}
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
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleDownload(f.fileId, f.fileName)} title="다운로드"
                    style={{
                      padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.card, cursor: 'pointer', fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700,
                    }}>⬇</button>
                  {(isAdmin || f.uploader === String(empno)) && (
                    <button onClick={() => handleDelete(f.fileId)} title="삭제"
                      style={{
                        padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5',
                        background: C.card, cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', fontWeight: 700,
                      }}>🗑</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 파일 수 요약 */}
      {!loading && !isEmpty && (
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: C.muted, textAlign: 'right' }}>
          📁 {folders.length}개 폴더 · 📄 {files.length}개 파일
        </div>
      )}
    </div>
  );
}
