import { useState } from 'react'
import {
  collection, query, where, getDocs,
  doc, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

export default function CoupleConnect({ user, userData }) {
  const [partnerCode, setPartnerCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(userData?.inviteCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>커플 연결하기</h2>
        <p style={{ color: '#999', marginTop: 6 }}>서로의 초대코드로 연결해요</p>
      </div>

      {/* 내 초대코드 */}
      <div style={{
        background: '#fff0f5',
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        marginBottom: 32
      }}>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 8 }}>내 초대코드</p>
        <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: 6, color: '#ff6b9d' }}>
          {userData?.inviteCode || '------'}
        </p>
        <button
          className="btn-secondary"
          style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
          onClick={copyCode}
        >
          {copied ? '복사됨 ✓' : '복사하기'}
        </button>
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
    </div>
  )
}
