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
  const [user, setUser] = useState(undefined) // undefined = loading
  const [userData, setUserData] = useState(null)
  const [pwaReady, setPwaReady] = useState(isPWAInstalled())
  const [testMode, setTestMode] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
    })
    return unsub
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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>로딩중...</div>
  }

  if (!user) return <Auth />

  if (!pwaReady) return <Onboarding onDone={() => setPwaReady(true)} />

  if (!userData?.partnerId && !testMode)
    return <CoupleConnect user={user} userData={userData} onTestMode={() => setTestMode(true)} />

  return <Home user={user} userData={userData} testMode={!userData?.partnerId && testMode} />
}
