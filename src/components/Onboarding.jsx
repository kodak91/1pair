import { useState, useEffect, useRef } from 'react'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function Onboarding({ onDone }) {
  const [showPromptModal, setShowPromptModal] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)
  const [checking, setChecking] = useState(false)
  const deferredPromptRef = useRef(null)
  const ios = isIOS()

  useEffect(() => {
    if (isPWAInstalled()) onDone()
  }, [onDone])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const handler = (e) => { if (e.matches) onDone() }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [onDone])

  async function handleConfirm() {
    setShowPromptModal(false)
    if (!ios && deferredPromptRef.current) {
      deferredPromptRef.current.prompt()
      const { outcome } = await deferredPromptRef.current.userChoice
      deferredPromptRef.current = null
      if (outcome !== 'accepted') {
        setShowInstructions(true)
      }
    } else {
      setShowInstructions(true)
    }
  }

  function handleCheck() {
    setChecking(true)
    if (isPWAInstalled()) {
      onDone()
    } else {
      setChecking(false)
      alert('홈화면의 1Pair 아이콘을 탭해서 다시 열어주세요!\n브라우저에서는 앱 기능이 제한돼요.')
    }
  }

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

      {/* 설치 유도 팝업 */}
      {showPromptModal && (
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#222' }}>
              홈화면에 추가하시겠습니까?
            </h3>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              1Pair를 홈화면에 추가하면<br/>앱처럼 편리하게 사용할 수 있어요.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowPromptModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: '1.5px solid #ddd', background: '#fff',
                  fontSize: 15, fontWeight: 600, color: '#888', cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: 'none', background: '#ff6b9d',
                  fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 설치 안내 (팝업 닫힌 후) */}
      <div style={{ fontSize: 56 }}>📱</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>홈화면에 추가해야<br/>사용할 수 있어요</h2>
      <p style={{ color: '#999', marginTop: 8, lineHeight: 1.6 }}>
        1Pair는 PWA 앱이에요.<br/>알림을 받으려면 홈화면 추가가 필요해요.
      </p>

      {showInstructions && (
        <div style={{
          background: '#fff0f5', borderRadius: 16, padding: 24,
          marginTop: 32, textAlign: 'left', width: '100%'
        }}>
          {ios ? (
            <>
              <p style={{ fontWeight: 700, marginBottom: 12 }}>🍎 iPhone / iPad 안내</p>
              <ol style={{ paddingLeft: 20, lineHeight: 2, color: '#555' }}>
                <li>하단 <strong>공유 버튼</strong> (□↑) 탭</li>
                <li><strong>"홈 화면에 추가"</strong> 선택</li>
                <li>오른쪽 상단 <strong>"추가"</strong> 탭</li>
                <li>홈화면의 1Pair 아이콘으로 재실행</li>
              </ol>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700, marginBottom: 12 }}>🤖 Android 안내</p>
              <ol style={{ paddingLeft: 20, lineHeight: 2, color: '#555' }}>
                <li>브라우저 우측 상단 <strong>메뉴 (⋮)</strong> 탭</li>
                <li><strong>"앱 설치"</strong> 또는 <strong>"홈 화면에 추가"</strong> 선택</li>
                <li>확인 후 홈화면 아이콘으로 재실행</li>
              </ol>
            </>
          )}
        </div>
      )}

      {!showPromptModal && (
        <>
          <button
            className="btn-primary"
            style={{ marginTop: 32 }}
            onClick={handleCheck}
            disabled={checking}
          >
            {checking ? '확인중...' : '홈화면에 추가했어요 ✓'}
          </button>
          <p style={{ color: '#ccc', fontSize: 13, marginTop: 16 }}>
            Safari / Chrome 브라우저에서 위 안내를 따라주세요
          </p>
        </>
      )}
    </div>
  )
}
