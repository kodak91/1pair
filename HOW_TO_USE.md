# 하네스 사용법

## 파일 구성
```
PROJECT_CONTEXT.md     ← 프로젝트 전체 설계도 (항상 먼저 읽힘)
WORK_ORDER_phase1.md   ← Phase 1 작업지시서
REVIEW_HARNESS.md      ← 작업 완료 후 리뷰용
```

---

## 사용 순서

### Step 1. Firebase 프로젝트 먼저 만들기
1. https://console.firebase.google.com 접속
2. 새 프로젝트 생성 → 이름: 1pair
3. Authentication 활성화 → 이메일/비밀번호 로그인 켜기
4. Firestore Database 생성 → 테스트 모드로 시작
5. 프로젝트 설정 → 웹 앱 추가 → config 복사 → .env에 붙여넣기
6. Cloud Messaging 탭 → 웹 푸시 인증서 → VAPID 키 생성 → .env에 추가

### Step 2. Claude Code에 작업 주기
```
[Claude Code 대화창에 순서대로 붙여넣기]

1. PROJECT_CONTEXT.md 전체 내용
   → "이게 프로젝트 컨텍스트야. 읽고 기억해."

2. WORK_ORDER_phase1.md 전체 내용
   → "이 작업지시서대로 구현해줘."
```

### Step 3. 작업 완료 후 리뷰
```
[새 Claude 대화창에]

1. REVIEW_HARNESS.md 전체 내용
2. Claude Code가 만든 주요 파일들 (firebase.js, App.jsx, Home.jsx 등)
   → "리뷰해줘"
```

### Step 4. Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서
vercel

# 환경변수는 Vercel 대시보드 → Settings → Environment Variables에 추가
```

---

## Phase 2 작업지시서 만들 때
Phase 1이 완료되면 Claude한테 이렇게 말해:
> "PROJECT_CONTEXT.md 보고 Phase 2 작업지시서 써줘"

---

## 주의사항
- Firebase 콘솔에서 Firestore Rules는 배포 전에 반드시 수정
- .env 파일은 절대 Github에 올리지 말 것
- Vercel 빌드 오류 나면: Settings → Build Command를 `node node_modules/vite/bin/vite.js build` 로 변경
