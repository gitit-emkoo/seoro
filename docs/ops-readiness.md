# SEORO 운영·클라우드·소셜 로그인 준비사항

## 1. 환경 분리

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 |
| `JWT_SECRET` | 운영에서는 반드시 강한 임의 값 |
| `JWT_EXPIRES_IN` | 기본 `7d` (갱신 API는 추후) |
| `CORS_ORIGIN` | 허용 프론트 오리진 |
| `UPLOAD_DIR` | 로컬 파일 루트 |
| `SEED_ADMIN` / `SEED_ADMIN_PASSWORD` | 운영 시드 관리자 (기본 비활성) |
| `NEXT_PUBLIC_API_BASE_URL` | 웹 → API |

로컬 `.env` 는 git 제외. 운영은 시크릿 매니저/호스팅 env 사용.

## 2. Supabase 이전 체크리스트

- Prisma 마이그레이션 재현: `prisma migrate deploy`
- DB: Supabase Postgres connection string (Direct / Pooler 구분)
- Nest 상시 서버 → Direct URL 우선
- 파일: `ObjectStorage` 인터페이스 유지, Supabase Storage 구현체 추가
- 비공개 버킷 + signed URL 또는 서버 프록시 다운로드
- 백업: DB daily snapshot + 스토리지 버전ing
- 모니터링: Sentry(또는 유사) + API 5xx 알림

현재는 **이전을 실행하지 않고** 인터페이스/환경 분리만 준비.

## 3. 보안 점검 요약

- 비밀번호: bcryptjs 해싱
- JWT: Bearer, 운영 기본 시크릿 차단
- 초대 토큰: SHA-256 해시 저장, 일회성/만료/재발급 시 폐기
- 파일: 본인 submission만 다운로드, MIME/크기 제한, path traversal 차단
- 상호 보고서: 양측 `CONSENTED` 서버 검증
- 관리자: `UserRole.ADMIN` + AdminGuard, 작업 감사 로그
- 개발 시드 관리자(`admin@seoro.local`)는 개발 전용

## 4. 법률/정책 미완료 (외부 검토 필요)

- 개인정보 처리방침
- 이용약관
- 민감정보(증빙) 수집·보관 기간·파기
- 공개 동의 문구 법률 검토
- 회원 탈퇴/데이터 삭제 SLA

## 5. 소셜 로그인 준비 (미구현)

우선순위: 카카오 → 구글 → 애플

필요 준비:
- 각 콘솔 앱 등록, redirect URI
- env: `KAKAO_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `APPLE_*`
- 계정 연결 정책: 동일 이메일 병합 vs 별도 계정, 기존 비밀번호 계정 연결 확인
- DB: `AuthIdentity(provider, providerUserId, userId)` 추가 예정
- 버튼만 넣고 완료 처리하지 않음 (자격증명 없으면 구현 보류)
