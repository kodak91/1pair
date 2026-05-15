import { GoogleAuth } from 'google-auth-library'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tokens, title, body, toUid } = req.body || {}
  if (!tokens?.length || !title || !body) {
    return res.status(400).json({ error: 'tokens(array), title, body 필요' })
  }

  let serviceAccount
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } catch {
    return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT 환경변수 파싱 실패' })
  }

  const projectId = serviceAccount.project_id

  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: [
      'https://www.googleapis.com/auth/firebase.messaging',
      'https://www.googleapis.com/auth/datastore',
    ],
  })

  let accessToken
  try {
    accessToken = await auth.getAccessToken()
  } catch (err) {
    return res.status(500).json({ error: `인증 실패: ${err.message}` })
  }

  // 모든 토큰에 FCM 전송 시도 (멀티 디바이스 지원)
  const unregisteredTokens = []
  let successCount = 0

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: { type: 'pippi' },
              },
            }),
          }
        )

        if (fcmRes.ok) {
          successCount++
          return
        }

        const errText = await fcmRes.text()
        let errData = {}
        try { errData = JSON.parse(errText) } catch { /* noop */ }

        const errStatus = errData?.error?.status
        const isUnregistered =
          fcmRes.status === 404 ||
          errStatus === 'NOT_FOUND' ||
          errStatus === 'UNREGISTERED'

        if (isUnregistered) {
          unregisteredTokens.push(token)
          console.log(`[send-pippi] 만료 토큰 감지: ${token.slice(0, 20)}...`)
        } else {
          console.error(`[send-pippi] FCM 전송 실패 (${fcmRes.status}):`, errText)
        }
      } catch (err) {
        console.error('[send-pippi] 네트워크 오류:', err.message)
      }
    })
  )

  // 만료된 토큰을 Firestore에서 제거 (arrayRemove)
  if (unregisteredTokens.length > 0 && toUid) {
    try {
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`
      const cleanupRes = await fetch(commitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          writes: [{
            transform: {
              document: `projects/${projectId}/databases/(default)/documents/users/${toUid}`,
              fieldTransforms: [{
                fieldPath: 'fcmTokens',
                removeAllFromArray: {
                  values: unregisteredTokens.map(t => ({ stringValue: t })),
                },
              }],
            },
          }],
        }),
      })
      if (cleanupRes.ok) {
        console.log(`[send-pippi] 만료 토큰 ${unregisteredTokens.length}개 제거 완료: users/${toUid}`)
      } else {
        const cleanupErr = await cleanupRes.text()
        console.warn('[send-pippi] 토큰 정리 실패:', cleanupErr)
      }
    } catch (cleanupErr) {
      console.warn('[send-pippi] 토큰 정리 요청 실패:', cleanupErr.message)
    }
  }

  if (successCount > 0) {
    return res.status(200).json({ success: true, delivered: successCount })
  }

  if (unregisteredTokens.length === tokens.length) {
    // 모든 토큰이 만료됨
    return res.status(410).json({ error: 'DEVICE_UNREGISTERED' })
  }

  // 일부 실패 (네트워크 오류 등)
  return res.status(500).json({ error: '일부 기기에 전송 실패' })
}
