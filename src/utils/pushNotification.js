import { subscribePush, unsubscribePush } from '../api/pushApi';

// VAPID 공개키 (Base64 URL → Uint8Array 변환)
const VAPID_PUBLIC_KEY = 'BFmTLEzbWGDKHmJkIUGb9W_bYpN179y73lMaa9Ugfj9pYYMSnm-WTIPhnRQeflro91ZnAy1NqsBVVeapdHW9tYY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// 브라우저가 Web Push 를 지원하는지 확인
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Service Worker 등록 + 푸시 구독 → 서버에 저장
// empno: 사원번호 (사원 로그인 시), null: 관리자
export async function registerPush(empno = null) {
  if (!isPushSupported()) {
    console.warn('이 브라우저는 Web Push를 지원하지 않습니다.');
    return;
  }

  try {
    // Service Worker 등록
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker 등록 완료');

    // 기존 구독 확인
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      // 새로 구독
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('푸시 구독 완료');
    }

    // 서버에 구독 정보 저장 (empno 포함)
    const subJson = subscription.toJSON();
    await subscribePush({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      empno: empno,
    });
    console.log('서버에 구독 정보 저장 완료 (empno=' + empno + ')');
  } catch (err) {
    console.error('푸시 등록 실패:', err);
  }
}

// 구독 해제
export async function unregisterPush() {
  if (!isPushSupported()) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;

    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      console.log('푸시 구독 해제 완료');
    }
  } catch (err) {
    console.error('푸시 해제 실패:', err);
  }
}
