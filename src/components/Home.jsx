import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
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

export default function Home({ user, userData }) {
  const [partnerData, setPartnerData] = useState(null)
  const [sending, setSending] = useState(null)
  const [lastSent, setLastSent] = useState(null)
  const [fcmReady, setFcmReady] = useState(false)

  // 파트너 정보 로드
  useEffect(() => {
    if (!userData?.partnerId) return
    getDoc(doc(db, 'users', userData.partnerId)).then(snap => {
      if (snap.exists()) setPartnerData(snap.data())
    })
  }, [userData?.partnerId])

  // FCM 토큰 등록
  useEffect(() => {
    let unsub
    async function setupFCM() {
      const messaging = await getMessagingInstance()
      if (!messaging) return

      try {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        })
        if (token && token !== userData?.fcmToken) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token })
        }
        setFcmReady(true)

        // 포그라운드 수신
        unsub = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {}
          if (title || body) {
            showInAppNotification(title, body)
          }
        })
      } catch (err) {
        console.warn('FCM 토큰 취득 실패:', err)
      }
    }
    setupFCM()
    return () => unsub?.()
  }, [user.uid, userData?.fcmToken])

  function showInAppNotification(title, body) {
    // 간단한 인앱 토스트 - 실제 Notification API 대신
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
    if (!partnerData?.fcmToken) {
      alert('상대방이 아직 알림을 설정하지 않았어요')
      return
    }
    setSending(type)
    try {
      // 1. Firestore 로그 저장
      await addDoc(collection(db, 'pippis'), {
        fromUid: user.uid,
        toUid: userData.partnerId,
        type,
        sentAt: serverTimestamp()
      })

      // 2. FCM HTTP v1 API 호출 (클라이언트에서 직접)
      const msgText = PIPPI_MESSAGES[type](userData.nickname)
      await sendFCMDirect(partnerData.fcmToken, '1Pair 삐삐 📳', msgText)

      setLastSent(type)
      setTimeout(() => setLastSent(null), 3000)
    } catch (err) {
      console.error('삐삐 전송 실패:', err)
      alert('전송에 실패했어요. 다시 시도해주세요')
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
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ff6b9d' }}>1Pair 💑</h1>
          <p style={{ color: '#999', fontSize: 13 }}>
            {userData?.nickname} → {partnerData?.nickname || '...'}
          </p>
        </div>
        <button
          style={{ background: 'none', color: '#ccc', padding: '8px 12px', fontSize: 13 }}
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
          {partnerData?.nickname || '상대방'}에게 전달할 감정을 선택하세요
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

      {/* FCM 상태 */}
      {!fcmReady && (
        <p style={{ color: '#ccc', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          알림 권한 설정 중...
        </p>
      )}
    </div>
  )
}
