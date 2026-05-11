# 1Pair - 프로젝트 마스터 컨텍스트

## 앱 한 줄 정의
커플이 카톡 대신 "감정"을 주고받는 앱. 채팅은 카톡이 하고, 1Pair는 같이 논다.

## 핵심 철학
- 채팅 없음. 푸시알림이 UX다.
- 한 명이 하면 상대방 폰에 뭔가 도착하는 구조.
- 앱을 "같이 켜는" 게 아니라 "한 명이 하면 상대가 반응하는" 구조.

## 기술 스택 (고정)
- Frontend: React + Vite + PWA (vite-plugin-pwa)
- DB: Firebase Firestore
- 푸시알림: Firebase FCM
- 인증: Firebase Authentication
- 배포: Vercel
- 패키지명: com.kodak91.onepair

## 개발 단계 로드맵

### Phase 1 - MVP (현재)
목표: 삐삐 기능 하나만 완벽하게
- 회원가입 / 로그인
- 커플 연결 (초대코드 6자리)
- 삐삐 전송 4종 (생각해 / 보고싶어 / 사랑해 / 전화해줘)
- FCM 푸시알림 수신
- PWA 홈화면 추가 강제 온보딩

성공 지표: 실제 커플 10쌍이 일주일 이상 씀

### Phase 2 - 관계 레이어 추가
- 커플 미션 (오늘의 미션 → 완료하면 상대 폰에 도착)
- 커플 캘린더 (약속 등록 → 알림)
- 기념일 D-day 알림

### Phase 3 - AI 어시스턴트 (수익화)
- 채팅 어시스턴트: 답변 예시 3개 제시 → 선택하면 카톡으로 복사
- 관계 분석 리포트: 7일 미션 데이터 기반
- 오작교 기능: AI가 서로 조율해줌
- 결제: 각자 독립 결제, 상대방 모름

### Phase 4 - 커뮤니티
- 커플 챌린지 (동작/표현 미션)
- 주변 커플들과 연합 챌린지
- 쇼츠 업로드 → 커플 인플루언서

### Phase 5 - 커머스/핀테크 (추후)
- 커플 통장 (충전식, 헤어지면 자동 해지)
- 인생네컷 주문 (앨범에서 4컷 골라 배송)
- 결혼 준비 어시스턴트 (플래너 대체)

## Firestore 데이터 구조

### users/{uid}
```
{
  nickname: string,
  inviteCode: string,        // 6자리 랜덤
  partnerId: string | null,
  coupleId: string | null,
  fcmToken: string,
  createdAt: timestamp
}
```

### couples/{coupleId}
```
{
  user1: uid,
  user2: uid,
  coupleName: string | null, // Phase 2에서 추가
  createdAt: timestamp
}
```

### pippis/{pippiId}  ← Phase 1
```
{
  fromUid: uid,
  toUid: uid,
  type: 'think' | 'miss' | 'love' | 'call',
  sentAt: timestamp
}
```

### missions/{missionId}  ← Phase 2
```
{
  coupleId: string,
  date: string,              // YYYY-MM-DD
  content: string,
  completedBy: uid | null,
  completedAt: timestamp | null
}
```

## 환경변수 목록 (.env)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

## 절대 하지 말 것
- 채팅 기능 추가 (카톡이 함)
- Phase 건너뛰기 (순서대로)
- 디자인 먼저 (기능 먼저)
- 복잡한 백엔드 (Firebase로 전부 해결)
- localStorage 사용 (Firestore로)
