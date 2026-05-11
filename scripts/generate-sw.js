// 빌드 전 .env 값을 firebase-messaging-sw.js에 주입
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// .env 파싱 (CI에서는 process.env 사용)
const envPath = resolve(root, '.env')
const env = {}
try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && key.trim()) env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.warn('⚠️  .env 파일 없음. process.env에서 읽습니다.')
}

// process.env로 보완 (CI/GitHub Actions 환경)
const keys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID']
for (const k of keys) {
  if (!env[k] && process.env[k]) env[k] = process.env[k]
}

if (!env['VITE_FIREBASE_API_KEY']) {
  console.warn('⚠️  Firebase 환경변수 없음. firebase-messaging-sw.js를 건너뜁니다.')
  process.exit(0)
}

const template = `importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "${env.VITE_FIREBASE_API_KEY || ''}",
  authDomain: "${env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${env.VITE_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${env.VITE_FIREBASE_APP_ID || ''}",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || '1Pair', {
    body: body || '새 삐삐가 도착했어요 💌',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
    vibrate: [200, 100, 200],
  })
})
`

writeFileSync(resolve(root, 'public/firebase-messaging-sw.js'), template)
console.log('✅ firebase-messaging-sw.js 생성 완료')
