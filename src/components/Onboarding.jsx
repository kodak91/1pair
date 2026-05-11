import { useState, useEffect } from 'react'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function Onboarding({ onDone }) {
  const [checking, setChecking] = useState(false)
  const ios = isIOS()

  // displaymode change 감지 (Android Chrome install prompt 후)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const handler = (e) => { if (e.matches) onDone() }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [onDone])

  function handleCheck() {
    setChecking(true)
    if (isPWAInstalled()) {
      onDone()
    } else {
      setChecking(false)
      alert('아직 홈화면에 추가되지 않았어요. 안내대로 진행해주세요!')
    }
  }

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 56 }}>📱</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>홈화면에 추가해야<br/>사용할 수 있어요</h2>
      <p style={{ color: '#999', marginTop: 8, lineHeight: 1.6 }}>
        1Pair는 PWA 앱이에요.<br/>알림을 받으려면 홈화면 추가가 필요해요.
      </p>

      <div style={{
        background: '#fff0f5',
        borderRadius: 16,
        padding: 24,
        marginTop: 32,
        textAlign: 'left',
        width: '100%'
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
    </div>
  )
}
