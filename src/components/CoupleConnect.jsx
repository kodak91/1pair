import { useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  collection, query, where, getDocs,
  doc, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function CoupleConnect({ user, userData, onTestMode }) {
  const [partnerCode, setPartnerCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(userData?.inviteCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareInvite() {
    const code = userData?.inviteCode || '------'
    const url = window.location.origin
    const text = `1Pair 커플 앱에 초대합니다 💑\n\n앱 설치: ${url}\n내 초대코드: ${code}\n\n설치 후 초대코드를 입력해주세요!`

    if (navigator.share) {
      try {
        await navigator.share({ title: '1Pair 초대', text })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        // 사용자가 취소한 경우 무시
      }
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  async function handleConnect(e) {
    e.preventDefault()
    const code = partnerCode.trim().toUpperCase()
    if (!code || code.length !== 6) { setError('6자리 코드를 입력해주세요'); return }
    if (code === userData?.inviteCode) { setError('내 코드는 입력할 수 없어요'); return }

    setLoading(true); setError('')
    try {
      const q = query(collection(db, 'users'), where('inviteCode', '==', code))
      const snap = await getDocs(q)
      if (snap.empty) { setError('해당 코드의 사용자를 찾을 수 없어요'); return }

      const partnerDoc = snap.docs[0]
      const partnerId = partnerDoc.id
      const partnerData = partnerDoc.data()

      if (partnerData.partnerId) { setError('이미 연결된 사용자예요'); return }

      const coupleId = [user.uid, partnerId].sort().join('_')
      const batch = writeBatch(db)

      batch.set(doc(db, 'couples', coupleId), {
        user1: user.uid,
        user2: partnerId,
        coupleName: null,
        createdAt: serverTimestamp()
      })
      batch.update(doc(db, 'users', user.uid), { partnerId, coupleId })
      batch.update(doc(db, 'users', partnerId), { partnerId: user.uid, coupleId })

      await batch.commit()
    } catch (err) {
      setError('연결 중 오류가 발생했어요. 다시 시도해주세요')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          style={{ background: 'none', color: '#888', padding: '8px 12px', fontSize: 13, border: '1px solid #eee', borderRadius: 8 }}
          onClick={() => signOut(auth)}
        >
          로그아웃
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>커플 연결하기</h2>
        <p style={{ color: '#999', marginTop: 6 }}>서로의 초대코드로 연결해요</p>
      </div>

      {/* 내 초대코드 */}
      <div style={{
        background: '#fff0f5', borderRadius: 16, padding: 24,
        textAlign: 'center', marginBottom: 32
      }}>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 8 }}>내 초대코드</p>
        <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: 6, color: '#ff6b9d' }}>
          {userData?.inviteCode || '------'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 20px' }}
            onClick={copyCode}
          >
            {copied ? '복사됨 ✓' : '코드 복사'}
          </button>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
            onClick={shareInvite}
          >
            {shared ? '공유됨 ✓' : '공유하기 📤'}
          </button>
        </div>
      </div>

      {/* 상대 코드 입력 */}
      <form onSubmit={handleConnect} className="gap-12">
        <p style={{ fontWeight: 600 }}>상대방 초대코드 입력</p>
        <input
          type="text"
          placeholder="6자리 코드 (예: A1B2C3)"
          value={partnerCode}
          onChange={e => setPartnerCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ textTransform: 'uppercase', letterSpacing: 3, textAlign: 'center', fontSize: 20 }}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '연결중...' : '연결하기 💑'}
        </button>
      </form>

      <p style={{ color: '#ccc', fontSize: 13, marginTop: 24, textAlign: 'center' }}>
        상대방도 이 앱에 가입해야 연결할 수 있어요
      </p>

      {/* 테스트 모드 */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          style={{
            background: '#f9f9f9', color: '#666', fontSize: 13, fontWeight: 600,
            padding: '12px 20px', border: '1.5px dashed #ccc', borderRadius: 10
          }}
          onClick={onTestMode}
        >
          🧪 테스트 모드 (혼자 알림 테스트)
        </button>
      </div>
    </div>
  )
}
