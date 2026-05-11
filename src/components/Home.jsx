import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { doc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { auth, db, getMessagingInstance } from '../firebase'

const PIPPI_TYPES = [
  { type: 'think', emoji: '💭', label: '생각해' },
  { type: 'miss',  emoji: '🥺', label: '보고싶어' },
  { type: 'love',  emoji: '❤️', label: '사랑해' },
  { type: 'call',  emoji: '📞', label: '전화해줘' },
]

const PIPPI_MESSAGES = {
  think: (name) => `💭 ${name}이(가) 지금 너를 생각하고 있어`,
  miss:  (name) => `🥺 ${name}이(가) 보고싶대`,
  love:  (name) => `❤️ ${name}이(가) 사랑한대`,
  call:  (name) => `📞 ${name}이(가) 전화하고 싶대`,
}

export default function Home({ user, userData, testMode = false }) {
  const [partnerData, setPartnerData] = useState(null)
  const [sending, setSending] = useState(null)
  const [lastSent, setLastSent] = useState(null)
  const [fcmReady, setFcmReady] = useState(false)
  const myFcmTokenRef = useRef(null)
  const [notifPermission, setNotifPermission] = useState('unknown')

  // 파트너 정보 실시간 구독 (onSnapshot으로 FCM 토큰 변경 즉시 반영)
  useEffect(() => {
    if (testMode) {
      setPartnerData(userData)
      return
    }
    if (!userData?.partnerId) return
    const unsub = onSnapshot(doc(db, 'users', userData.partnerId), (snap) => {
      if (snap.exists()) setPartnerData(snap.data())
    })
    return unsub
  }, [userData?.partnerId, testMode, userData])

  // FCM 초기화
  useEffect(() => {
    if (!('Notification' in window)) return
    const perm = Notification.permission
    if (perm === 'granted') {
      setNotifPermission('granted')
      initFCM()
    } else if (perm === 'denied') {
      setNotifPermission('denied')
    } else {
      setNotifPermission('asking')
    }
  }, [])

  async function requestPermissionAndInit() {
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') await initFCM()
  }

  async function initFCM() {
    const messaging = await getMessagingInstance()
    if (!messaging) return
    try {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      })
      if (token) {
        myFcmTokenRef.current = token
        if (token !== userData?.fcmToken) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token })
        }
      }
      setFcmReady(true)

      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {}
        if (title || body) showInAppNotification(title, body)
      })
    } catch (err) {
      console.warn('FCM 토큰 취득 실패:', err)
      alert(`알림 설정 실패: ${err.message}`)
    }
  }

  function showInAppNotification(title, body) {
    const el = document.createElement('div')
    el.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      background:#333;color:#fff;padding:12px 20px;border-radius:12px;
      font-size:14px;z-index:9999;max-width:320px;text-align:center;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
    `
    el.textContent = body || title
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 4000)
  }

  async function sendPippi(type) {
    const targetToken = testMode ? myFcmTokenRef.current : partnerData?.fcmToken
    if (!targetToken) {
      alert(testMode
        ? '알림 권한을 허용해야 테스트 알림을 받을 수 있어요'
        : '상대방이 아직 알림을 허용하지 않았어요.\n상대방 앱에서 알림을 허용해주세요.')
      return
    }
    setSending(type)
    try {
      await addDoc(collection(db, 'pippis'), {
        fromUid: user.uid,
        toUid: testMode ? user.uid : userData.partnerId,
        type,
        sentAt: serverTimestamp()
      })
      const msgText = PIPPI_MESSAGES[type](userData.nickname)
      await sendFCMDirect(targetToken, '1Pair 삐삐 📳', msgText)
      setLastSent(type)
      setTimeout(() => setLastSent(null), 3000)
    } catch (err) {
      console.error('삐삐 전송 실패:', err)
      alert(`전송 실패: ${err.message}`)
    } finally {
      setSending(null)
    }
  }

  async function sendFCMDirect(token, title, body) {
    const response = await fetch('/api/send-pippi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, title, body }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'FCM 전송 실패')
    }
    return response.json()
  }

  return (
    <div className="page">
      {/* 알림 권한 요청 팝업 */}
      {notifPermission === 'asking' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32,
            width: '100%', maxWidth: 320, textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>알림 권한이 필요해요</h3>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              상대방의 삐삐를 받으려면<br/>알림 권한을 허용해주세요.
            </p>
            <button className="btn-primary" onClick={requestPermissionAndInit}>
              알림 허용하기
            </button>
          </div>
        </div>
      )}

      {/* 알림 차단 안내 */}
      {notifPermission === 'denied' && (
        <div style={{
          background: '#fff3cd', borderRadius: 12, padding: '12px 16px',
          fontSize: 13, color: '#856404', marginBottom: 16, textAlign: 'center'
        }}>
          🔕 알림이 차단되어 있어요.<br/>
          브라우저 설정 → 알림 → 이 사이트 허용 후 새로고침해주세요.
        </div>
      )}

      {/* 테스트 모드 배너 */}
      {testMode && (
        <div style={{
          background: '#fff3cd', borderRadius: 10, padding: '10px 16px',
          fontSize: 13, color: '#856404', marginBottom: 16, textAlign: 'center'
        }}>
          🧪 테스트 모드 — 알림이 나에게 전송돼요
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ff6b9d' }}>1Pair 💑</h1>
          <p style={{ color: '#999', fontSize: 13 }}>
            {userData?.nickname} → {testMode ? '나 (테스트)' : partnerData?.nickname || '...'}
          </p>
        </div>
        <button
          style={{ background: 'none', color: '#888', padding: '8px 12px', fontSize: 13, border: '1px solid #eee', borderRadius: 8 }}
          onClick={() => signOut(auth)}
        >
          로그아웃
        </button>
      </div>

      {/* 삐삐 전송 완료 피드백 */}
      {lastSent && (
        <div style={{
          background: '#fff0f5', borderRadius: 16, padding: 16,
          textAlign: 'center', marginBottom: 24, fontSize: 15
        }}>
          {PIPPI_MESSAGES[lastSent](userData.nickname)} 💌
        </div>
      )}

      {/* 삐삐 버튼들 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ textAlign: 'center', color: '#999', marginBottom: 24, fontSize: 15 }}>
          {testMode ? '테스트 알림을 보내보세요' : `${partnerData?.nickname || '상대방'}에게 전달할 감정을 선택하세요`}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {PIPPI_TYPES.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() => sendPippi(type)}
              disabled={!!sending}
              style={{
                background: sending === type ? '#ff6b9d' : '#fff',
                color: sending === type ? '#fff' : '#333',
                border: '2px solid #ffb3cc',
                borderRadius: 20,
                padding: '32px 16px',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(255,107,157,0.1)'
              }}
            >
              <span style={{ fontSize: 40 }}>{emoji}</span>
              <span>{sending === type ? '전송중...' : label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 알림 상태 */}
      {!fcmReady && notifPermission === 'granted' && (
        <p style={{ color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          알림 설정 중...
        </p>
      )}
    </div>
  )
}
