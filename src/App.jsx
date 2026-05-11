import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import CoupleConnect from './components/CoupleConnect'
import Home from './components/Home'

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [userData, setUserData] = useState(null)
  const [pwaReady, setPwaReady] = useState(isPWAInstalled())
  const [testMode, setTestMode] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 6000)
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timer)
      setUser(u)
    })
    return () => { unsub(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!user) {
      setUserData(null)
      setTestMode(false)
      return
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data())
    })
    return unsub
  }, [user])

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <div>로딩중...</div>
        {loadTimeout && (
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#ff6b9d', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 700 }}
          >
            새로고침
          </button>
        )}
      </div>
    )
  }

  if (!user) return <Auth />

  if (!pwaReady) return <Onboarding onDone={() => setPwaReady(true)} />

  if (!userData?.partnerId && !testMode)
    return <CoupleConnect user={user} userData={userData} onTestMode={() => setTestMode(true)} />

  return <Home user={user} userData={userData} testMode={!userData?.partnerId && testMode} />
}
