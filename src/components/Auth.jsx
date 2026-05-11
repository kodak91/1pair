import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function uniqueInviteCode() {
  let code, exists
  do {
    code = generateInviteCode()
    const q = query(collection(db, 'users'), where('inviteCode', '==', code))
    const snap = await getDocs(q)
    exists = !snap.empty
  } while (exists)
  return code
}

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }
    setLoading(true); setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const inviteCode = await uniqueInviteCode()
      await setDoc(doc(db, 'users', cred.user.uid), {
        nickname: nickname.trim(),
        inviteCode,
        partnerId: null,
        coupleId: null,
        fcmToken: null,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  function friendlyError(code) {
    const map = {
      'auth/email-already-in-use': '이미 사용 중인 이메일이에요',
      'auth/invalid-email': '이메일 형식이 올바르지 않아요',
      'auth/weak-password': '비밀번호는 6자 이상이어야 해요',
      'auth/user-not-found': '가입된 계정이 없어요',
      'auth/wrong-password': '비밀번호가 틀렸어요',
      'auth/invalid-credential': '이메일 또는 비밀번호가 틀렸어요',
    }
    return map[code] || '오류가 발생했어요. 다시 시도해주세요'
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48 }}>💑</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ff6b9d', marginTop: 8 }}>1Pair</h1>
        <p style={{ color: '#999', marginTop: 4 }}>감정을 전하는 가장 빠른 방법</p>
      </div>

      <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="gap-12">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={12}
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '처리중...' : mode === 'signup' ? '가입하기' : '로그인'}
        </button>
      </form>

      <button
        className="btn-secondary mt-16"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
      >
        {mode === 'login' ? '계정이 없어요 → 회원가입' : '이미 계정이 있어요 → 로그인'}
      </button>
    </div>
  )
}
