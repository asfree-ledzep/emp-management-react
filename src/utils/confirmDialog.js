// 전역 Confirm / Alert 유틸
// window.confirm / window.alert 대신 예쁜 모달을 보여줍니다.

let _resolver = null;

/**
 * 확인/취소 모달 (Promise<boolean>)
 * @param {string} message
 * @param {object} opts - { title, confirmText, cancelText, danger }
 */
export function showConfirm(message, {
  title       = '확인',
  confirmText = '확인',
  cancelText  = '취소',
  danger      = true,
} = {}) {
  return new Promise(resolve => {
    _resolver = resolve;
    window.dispatchEvent(new CustomEvent('app:modal', {
      detail: { type: 'confirm', message, title, confirmText, cancelText, danger },
    }));
  });
}

/**
 * 알림 모달 (Promise<void>)
 * @param {string} message
 * @param {object} opts - { title }
 */
export function showAlert(message, { title = '알림' } = {}) {
  return new Promise(resolve => {
    _resolver = resolve;
    window.dispatchEvent(new CustomEvent('app:modal', {
      detail: { type: 'alert', message, title },
    }));
  });
}

/** 내부 전용 — GlobalConfirmModal이 호출 */
export function _resolveModal(result) {
  if (_resolver) { _resolver(result); _resolver = null; }
}
