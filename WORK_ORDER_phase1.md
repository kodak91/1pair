# 작업지시서 - Phase 1: 삐삐 MVP

> 이 파일을 Claude Code에 통째로 붙여넣기 하세요.
> PROJECT_CONTEXT.md를 먼저 읽히고 이 파일을 주세요.

---

## 작업 범위
삐삐 기능 MVP. 이것만 완벽하게 동작하면 됨.
디자인은 최소한. 기능 동작이 목적.

## 구현 목록

### [AUTH-1] Firebase 초기화
- src/firebase.js 생성
- Firebase Auth, Firestore, Messaging 초기화
- 환경변수(.env)에서 config 읽기

### [AUTH-2] 회원가입
- 이메일 + 비밀번호 + 닉네임 입력
- Firebase Auth 계정 생성
- Firestore users/{uid} 문서 생성
  - nickname, inviteCode(6자리 랜덤), partnerId: null, fcmToken: null

### [AUTH-3] 로그인
- 이메일 + 비밀번호
- 로그인 후 커플 연결 여부 확인
  - partnerId 없으면 → 커플 연결 화면
  - partnerId 있으면 → 홈(삐삐 화면)

### [COUPLE-1] 커플 연결
- 내 초대코드 표시 + 복사 버튼
- 상대 초대코드 입력 → 연결 버튼
- 연결 로직:
  1. inviteCode로 상대 uid 검색
  2. couples 컬렉션에 문서 생성
  3. 양쪽 users 문서에 partnerId, coupleId 업데이트

### [PWA-1] 홈화면 추가 온보딩
- 앱 진입 시 홈화면 설치 여부 확인
- 미설치 상태면 온보딩 화면 표시 (삐삐 화면 진입 차단)
- iOS 안내: "Safari → 공유버튼(네모+화살표) → 홈화면에 추가"
- Android 안내: "브라우저 메뉴 → 앱 설치 or 홈화면에 추가"
- 설치 확인 후 진입 허용

### [FCM-1] FCM 토큰 등록
- 홈화면 설치 감지 후 알림 권한 요청
- FCM 토큰 발급 → Firestore users/{uid}.fcmToken 저장
- public/firebase-messaging-sw.js 서비스워커 생성

### [PIPPI-1] 삐삐 전송
- 삐삐 4종 버튼
  - 💭 생각해 (type: 'think')
  - 🥺 보고싶어 (type: 'miss')
  - ❤️ 사랑해 (type: 'love')
  - 📞 전화해줘 (type: 'call')
- 버튼 누르면:
  1. Firestore pippis 컬렉션에 로그 저장
  2. 상대방 fcmToken으로 FCM HTTP v1 API 직접 호출
- FCM 전송은 클라이언트에서 직접 (Cloud Functions 없이)
  - Firebase 프로젝트의 서버 키 사용

### [PIPPI-2] 삐삐 수신 알림
- 백그라운드: 서비스워커가 수신 처리
- 포그라운드: onMessage 핸들러로 처리
- 알림 텍스트 예시:
  - think: "💭 [닉네임]이 지금 너를 생각하고 있어"
  - miss: "🥺 [닉네임]이 보고싶대"
  - love: "❤️ [닉네임]이 사랑한대"
  - call: "📞 [닉네임]이 전화하고 싶대"

## 파일 구조
```
src/
  components/
    Auth.jsx          ← 로그인/회원가입
    Onboarding.jsx    ← PWA 홈화면 추가 안내
    CoupleConnect.jsx ← 초대코드 연결
    Home.jsx          ← 삐삐 메인 화면
  firebase.js
  App.jsx
  main.jsx
public/
  firebase-messaging-sw.js
.env
vite.config.js        ← vite-plugin-pwa 설정 포함
```

## 완료 조건 체크리스트
- [ ] 회원가입 → 로그인 됨
- [ ] 초대코드로 커플 연결 됨
- [ ] 삐삐 버튼 누르면 상대 폰에 푸시알림 옴
- [ ] 앱 꺼져있어도 알림 옴
- [ ] PWA 홈화면 추가 온보딩 작동함
