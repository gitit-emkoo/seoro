# SEORO — Agent & Collaboration Guide

이 문서는 사람과 AI 에이전트가 같은 방식으로 git 협업하도록 적습니다.  
Cursor 규칙은 `.cursor/rules/git-collaboration.mdc`에도 있습니다.

## Branch model (GitHub Flow)

| 브랜치 | 역할 |
|--------|------|
| `main` | 공유 기준선. 직접 커밋/푸시하지 않음 |
| `feature/<topic>` | 실제 작업 단위 (예: `feature/emotion-diary`) |

`main`은 PR로만 갱신합니다.

## Day-to-day

1. `feature/<topic>`에서 작업하고 커밋합니다. (커밋은 사용자 요청 시)
2. 협업 공유는 **피처 브랜치를 remote에 푸시**하면 됩니다. main 머지 전에도 상대가 pull 가능합니다.
3. 푸시 / PR / main 머지는 **사용자가 요청할 때만** 실행합니다.

```bash
# 공유
git push -u origin HEAD

# 상대가 이어받기
git fetch origin
git checkout feature/<topic>
git pull
```

## Syncing with a teammate’s branch

피처끼리 맞춰도 됩니다 (main을 거치지 않아도 됨).

```bash
git fetch origin
git merge origin/feature/<other-topic>
```

충돌은 해당 피처에서 해결한 뒤 다시 푸시합니다.

## Merging into main

기능이 공식 기준이 될 때 PR로 합칩니다.

```bash
gh pr create --base main --head feature/<topic>
```

- `main`에 force push 금지
- `--no-verify`로 훅 건너뛰기 금지 (사용자 명시 제외)

## Remotes

- 기본 remote: `origin` → `https://github.com/gitit-emkoo/seoro.git`
