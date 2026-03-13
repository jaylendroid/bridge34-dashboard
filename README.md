# FireAnt Dashboard 셋업 가이드

## 구글 시트 구조

### Tasks 탭 (헤더 1행 고정)
| Task | Client | Assignee | Status | Due Date | Priority | Notes |
|------|--------|----------|--------|----------|----------|-------|
| (할 일 내용) | Blockstreet | Jaylen | To-Do | 3/14 | High | |

- **Status 값**: `To-Do` / `In Progress` / `Done`
- **Priority 값**: `High` / `Mid` / (비워두면 표시 안됨)

### Clients 탭 (헤더 1행 고정)
| Client | Category | Assignee | KOL | Community | Risk | Next Action | Notes |
|--------|----------|----------|-----|-----------|------|-------------|-------|
| Blockstreet | 진행중 | Jaylen | 계약형 5개 | 운영중 | Green | | |

- **Category 값**: `진행중` / `논의중` / `중단`
- **Risk 값**: `Green` / `Yellow` / `Red`

---

## 클라이언트 목록 (미리 입력)

### 진행중
- Blockstreet
- Infinit
- Aligned Layer
- Momentum
- Falcon Finance
- Arcium
- Billions
- Eigen Labs
- Virtuals
- Sahara AI
- Everything

### 논의중
- QFEX / MegaETH / Monad / BaseLine / Kgen / D3 / Metamask / 8lends / Presto / Sign / Spoon Finance

### 잠정 중단
- Aria AI / Life4Cuts / Pin AI & aiUSD / ZTX / Merlin / Synfutures / Stable

---

## Apps Script 배포 방법

1. 구글 시트 열기 → **확장 프로그램 > Apps Script**
2. `코드.gs` 내용 전체 교체 (Code.gs 파일 내용 붙여넣기)
3. 파일 추가 (+ 버튼) → **HTML** 선택 → 이름: `index` → index.html 내용 붙여넣기
4. `Code.gs`에서 `SPREADSHEET_ID` 수정
   - 시트 URL: `https://docs.google.com/spreadsheets/d/**[이게 ID]**/edit`
5. **배포 > 새 배포** 클릭
   - 유형: 웹 앱
   - 실행 계정: 나
   - 액세스 권한: **나만** 또는 **조직 내 모든 사용자**
6. 배포 후 URL 복사 → TV 크롬 브라우저에서 열기

---

## TV 설정 팁
- 크롬 브라우저 → 주소창에 URL 입력 → 전체화면(F11)
- 키오스크 모드: URL 앞에 붙여넣기 불필요, 그냥 북마크 등록하면 됨
- 30초마다 자동 새로고침됨 (별도 작업 불필요)
