importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAHGw_U47BuWyY4LUZAaM_L59VdR7oSlK0",
  authDomain: "onepair-kodak.firebaseapp.com",
  projectId: "onepair-kodak",
  storageBucket: "onepair-kodak.firebasestorage.app",
  messagingSenderId: "247399247802",
  appId: "1:247399247802:web:09d421cdef98ab3ec2f783",
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
