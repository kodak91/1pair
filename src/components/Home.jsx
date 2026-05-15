import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import {
  doc, onSnapshot, collection, addDoc, serverTimestamp,
  updateDoc, arrayUnion, query, where, orderBy, limit,
} from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { auth, db, getMessagingInstance } from '../firebase'

const QUICK_MESSAGES = [
  { type: 'voice',      label: '목소리 듣고 싶어',    icon: '📞' },
  { type: 'arrived',    label: '도착했어',              icon: '📍' },
  { type: 'late',       label: '늦을 것 같아',          icon: '⏰' },
  { type: 'thinking',   label: '널 생각하고 있어',      icon: '💭' },
  { type: 'miss',       label: '보고 싶어',              icon: '🥺' },
  { type: 'going_home', label: '집에 가는 중',           icon: '🏠' },
  { type: 'love',       label: '사랑해 ❤️',             icon: '❤️' },
  { type: 'ate',        label: '밥 먹었어?',             icon: '🍚' },
  { type: 'fighting',   label: '화이팅!',                icon: '✊' },
  { type: 'goodnight',  label: '잘 자, 내일 봐 ❤️',    icon: '🌙' },
  { type: 'yes',        label: '응',                     icon: '✅' },
  { type: 'no',         label: '아니',                   icon: '❌' },
]

const MSG_LABEL = {
  voice: '목소리 듣고 싶어', arrived: '도착했어', late: '늦을 것 같아',
  thinking: '널 생각하고 있어', miss: '보고 싶어', going_home: '집에 가는 중',
  love: '사랑해 ❤️', ate: '밥 먹었어?', fighting: '화이팅!',
  goodnight: '잘 자, 내일 봐 ❤️', yes: '응', no: '아니',
  think: '널 생각하고 있어', call: '전화하고 싶어',
}

function getPartnerTokens(pd) {
  if (!pd) return []
  return pd.fcmTokens?.length ? pd.fcmTokens : pd.fcmToken ? [pd.fcmToken] : []
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const hr = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hr}:${mi}`
}

export default function Home({ user, userData, testMode = false }) {
  const [partnerData, setPartnerData] = useState(null)
  const [sending, setSending] = useState(null)
  const [lastReceived, setLastReceived] = useState(null)
  const [fcmReady, setFcmReady] = useState(false)
  const myFcmTokenRef = useRef(null)
  const [notifPermission, setNotifPermission] = useState('unknown')

  useEffect(() => {
    const prevBody = document.body.style.background
    const root = document.getElementById('root')
    const prevRoot = root?.style.background
    document.body.style.background = '#1a1a1a'
    if (root) root.style.background = '#1a1a1a'
    return () => {
      document.body.style.background = prevBody
      if (root) root.style.background = prevRoot
    }
  }, [])

  useEffect(() => {
    if (testMode) { setPartnerData(userData); return }
    if (!userData?.partnerId) return
    return onSnapshot(doc(db, 'users', userData.partnerId), (snap) => {
      if (snap.exists()) setPartnerData(snap.data())
    })
  }, [userData?.partnerId, testMode, userData])

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'pippis'),
      where('toUid', '==', user.uid),
      orderBy('sentAt', 'desc'),
      limit(1)
    )
    return onSnapshot(q, (snap) => {
      if (!snap.empty) setLastReceived(snap.docs[0].data())
    })
  }, [user?.uid])

  useEffect(() => {
    if (!('Notification' in window)) return
    const p = Notification.permission
    if (p === 'granted') { setNotifPermission('granted'); initFCM() }
    else if (p === 'denied') setNotifPermission('denied')
    else setNotifPermission('asking')
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
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      if (!swReg.active) {
        await new Promise(resolve => {
          const sw = swReg.installing || swReg.waiting
          if (!sw) return resolve()
          sw.addEventListener('statechange', function h(e) {
            if (e.target.state === 'activated') { sw.removeEventListener('statechange', h); resolve() }
          })
        })
      }
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      })
      if (!token) return
      myFcmTokenRef.current = token
      const key = `fcmToken_${user.uid}`
      if (token !== sessionStorage.getItem(key)) {
        await updateDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) })
        sessionStorage.setItem(key, token)
      }
      setFcmReady(true)
      onMessage(messaging, () => {})
    } catch (e) { console.warn('FCM init:', e) }
  }

  async function sendPippi(type) {
    const tokens = testMode
      ? (myFcmTokenRef.current ? [myFcmTokenRef.current] : [])
      : getPartnerTokens(partnerData)
    const toUid = testMode ? user.uid : userData?.partnerId
    if (!toUid) return
    setSending(type)
    try {
      await addDoc(collection(db, 'pippis'), {
        fromUid: user.uid, toUid, type, sentAt: serverTimestamp(),
      })
      if (tokens.length) {
        const label = MSG_LABEL[type] || type
        const res = await fetch('/api/send-pippi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens, title: '📟 삐삐왔다',
            body: `${userData.nickname}: ${label}`, toUid,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'FCM 전송 실패')
        }
      }
    } catch (e) {
      console.error('sendPippi:', e)
      if (e.message === 'DEVICE_UNREGISTERED')
        setPartnerData(prev => prev ? { ...prev, fcmTokens: [], fcmToken: null } : prev)
    } finally {
      setSending(null)
    }
  }

  const partnerNoTokens = !testMode && partnerData && !getPartnerTokens(partnerData).length
  const connected = testMode ? fcmReady : (!!partnerData && getPartnerTokens(partnerData).length > 0)
  const myName = userData?.nickname || '나'
  const partnerName = testMode ? '나' : (partnerData?.nickname || '...')
  const lcdText = lastReceived ? (MSG_LABEL[lastReceived.type] || lastReceived.type) : null
  const lcdTime = lastReceived?.sentAt ? fmtTime(lastReceived.sentAt) : null
  const senderName = lastReceived
    ? (lastReceived.fromUid === userData?.partnerId ? partnerName : myName)
    : null

  return (
    <div style={S.root}>

      {/* 알림 권한 팝업 */}
      {notifPermission === 'asking' && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>📟</div>
            <h3 style={{ color: '#a8c860', fontSize: 22, marginBottom: 8 }}>알림 권한 필요</h3>
            <p style={{ color: '#6a8a40', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
              삐삐를 받으려면<br />알림 권한을 허용해주세요.
            </p>
            <button onClick={requestPermissionAndInit} style={S.allowBtn}>
              [ 허용하기 ]
            </button>
          </div>
        </div>
      )}

      {/* 상단 상태바 */}
      <div style={S.statusBar}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <span style={{
            fontSize: 14,
            color: connected ? '#70cc30' : '#cc3322',
            fontFamily: "'VT323', monospace",
            letterSpacing: 2,
            lineHeight: 1,
          }}>
            {connected ? '▁▃▅█' : '✕ ✕ ✕'}
          </span>
          <span style={{
            fontSize: 11,
            color: connected ? '#4a8a20' : '#8a3020',
            fontFamily: "'VT323', monospace",
            letterSpacing: 1,
          }}>
            {connected ? 'ONLINE' : 'NO SIGNAL'}
          </span>
        </div>

        <span style={S.nameText}>
          {myName}&nbsp;<span style={{ color: '#d05858' }}>♥</span>&nbsp;{partnerName}
        </span>

        <button onClick={() => signOut(auth)} style={S.outBtn}>OUT</button>
      </div>

      {/* 경고 배너 */}
      {notifPermission === 'denied' && (
        <div style={S.banner}>⚠ 알림 차단 — 브라우저 설정에서 허용 필요</div>
      )}
      {partnerNoTokens && (
        <div style={S.banner}>⚠ 상대방 연결 만료 — 앱 실행 시 자동 복구</div>
      )}
      {testMode && (
        <div style={{ ...S.banner, color: '#80a840', borderColor: '#3a5a20' }}>
          [TEST MODE] 알림이 나에게 전송됩니다
        </div>
      )}

      {/* 삐삐 이미지 + LCD 오버레이 */}
      <div style={S.pagerSection}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <img src="/bbibbi.png" alt="삐삐" style={S.pagerImg} />

          {/* LCD 액정 오버레이 */}
          <div style={S.lcdOverlay}>
            {lcdText ? (
              <>
                <div style={S.lcdMsg}>
                  {senderName && (
                    <span style={{ opacity: 0.65, fontStyle: 'normal' }}>
                      {senderName}&gt;&nbsp;
                    </span>
                  )}
                  {lcdText}
                </div>
                {lcdTime && <div style={S.lcdTimestamp}>{lcdTime}</div>}
              </>
            ) : (
              <div style={{ ...S.lcdMsg, opacity: 0.3, textAlign: 'center', letterSpacing: 4 }}>
                _ _ _ _ _
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 퀵 메시지 영역 */}
      <div style={S.quickWrap}>
        <div style={S.qHeader}>◈ QUICK MSG ◈</div>

        <div style={S.grid}>
          {QUICK_MESSAGES.map(({ type, label, icon }) => {
            const isThis = sending === type
            const isDimmed = !!sending && !isThis
            return (
              <button
                key={type}
                onClick={() => sendPippi(type)}
                disabled={!!sending}
                style={{
                  ...S.qBtn,
                  background: `url('/button.png') center/100% 100% no-repeat, #252b18`,
                  border: `2px solid ${isThis ? '#6a9040' : '#3a4828'}`,
                  color: isThis ? '#d4e890' : '#9ab858',
                  opacity: isDimmed ? 0.42 : 1,
                  transform: isThis ? 'translateY(2px)' : 'translateY(0)',
                  boxShadow: isThis ? 'none' : '0 3px 0 #0c0d08',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 15, lineHeight: 1.2, wordBreak: 'keep-all' }}>
                  {isThis ? '전송중...' : label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const FONT = "'VT323', 'Nanum Gothic Coding', monospace"

const S = {
  root: {
    minHeight: '100vh',
    background: '#1a1a1a',
    color: '#9ab858',
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
  },

  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.82)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 24,
    fontFamily: FONT,
  },
  modal: {
    background: '#1c2214',
    border: '2px solid #4a5c2e',
    borderRadius: 4, padding: 28,
    width: '100%', maxWidth: 280,
    textAlign: 'center',
    fontFamily: FONT,
  },
  allowBtn: {
    background: `url('/button.png') center/100% 100% no-repeat, #2a3418`,
    color: '#a0bc60',
    border: '2px solid #4a5c2e',
    borderRadius: 2, padding: '10px 20px',
    fontSize: 20, fontFamily: FONT,
    cursor: 'pointer', width: '100%',
  },

  statusBar: {
    padding: '10px 18px 9px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#111310',
    borderBottom: '1px solid #252a18',
  },
  nameText: {
    fontSize: 22,
    color: '#9ab858',
    letterSpacing: 3,
    fontFamily: FONT,
  },
  outBtn: {
    background: 'none',
    color: '#404c28',
    border: '1px solid #2e3820',
    borderRadius: 2, padding: '2px 8px',
    fontSize: 13, fontFamily: "'VT323', monospace",
    cursor: 'pointer',
  },

  banner: {
    background: '#161610',
    borderTop: '1px solid #5a4a20',
    borderBottom: '1px solid #5a4a20',
    padding: '6px 16px',
    fontSize: 14, color: '#c09040',
    textAlign: 'center',
    fontFamily: FONT,
  },

  pagerSection: {
    padding: '18px 30px 10px',
    display: 'flex', justifyContent: 'center',
    background: '#111310',
  },
  pagerImg: {
    width: '100%',
    imageRendering: 'pixelated',
    display: 'block',
  },
  lcdOverlay: {
    position: 'absolute',
    top: '11%', left: '7%',
    width: '83%', height: '43%',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center',
    padding: '3% 6%',
    overflow: 'hidden',
  },
  lcdMsg: {
    fontSize: 'clamp(13px, 4vw, 19px)',
    color: '#2a3c0c',
    fontFamily: FONT,
    lineHeight: 1.35,
    wordBreak: 'keep-all',
  },
  lcdTimestamp: {
    position: 'absolute',
    bottom: '8%', right: '6%',
    fontSize: 'clamp(10px, 2.5vw, 13px)',
    color: '#3a4c18',
    fontFamily: "'VT323', monospace",
    opacity: 0.85,
  },

  quickWrap: {
    padding: '14px 16px 36px',
    flex: 1, background: '#1a1a1a',
  },
  qHeader: {
    fontSize: 17, color: '#505e30',
    letterSpacing: 4, textAlign: 'center',
    marginBottom: 12,
    fontFamily: "'VT323', monospace",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  qBtn: {
    borderRadius: 3,
    padding: '10px 8px',
    fontSize: 15,
    fontFamily: FONT,
    display: 'flex', alignItems: 'center', gap: 6,
    cursor: 'pointer',
    transition: 'transform 0.08s, opacity 0.1s, box-shadow 0.08s',
    textAlign: 'left',
  },
}
