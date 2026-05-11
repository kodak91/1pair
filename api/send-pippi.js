import { GoogleAuth } from 'google-auth-library'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, title, body } = req.body || {}
  if (!token || !title || !body) {
    return res.status(400).json({ error: 'token, title, body 필요' })
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    const projectId = serviceAccount.project_id

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    const accessToken = await auth.getAccessToken()

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

    if (!fcmRes.ok) {
      const text = await fcmRes.text()
      throw new Error(text)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[send-pippi]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
