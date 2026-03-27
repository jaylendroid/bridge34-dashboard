# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. 계정 생성/로그인
3. **New Project** 클릭
4. 프로젝트 명: `bridge34-dashboard`
5. 리전: `Asia Pacific (Singapore)` 선택
6. 강력한 비밀번호 설정
7. **Create new project** 클릭 (약 3분 대기)

---

## 2. 테이블 생성

### SQL Editor에서 다음 코드 실행:

```sql
-- Tasks 테이블
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task VARCHAR(255) NOT NULL,
  client VARCHAR(100),
  assignee VARCHAR(100),
  status VARCHAR(20) DEFAULT 'To-Do', -- To-Do, In Progress, Done
  due_date DATE,
  priority VARCHAR(20), -- High, Mid, (blank)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients 테이블
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50), -- 진행중, 논의중, 중단
  assignee VARCHAR(100),
  kol VARCHAR(255),
  community VARCHAR(255),
  risk VARCHAR(20), -- Green, Yellow, Red
  next_action TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Events 테이블 (Google Calendar 동기화용)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary VARCHAR(255) NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  calendar_email VARCHAR(100),
  meet_link TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public 접근 정책 (회사 내부용이므로)
CREATE POLICY "Enable all access for authenticated users"
  ON tasks FOR ALL
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON clients FOR ALL
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON events FOR ALL
  USING (true);
```

---

## 3. API Key 발급

1. Supabase 대시보드 → **Settings** → **API**
2. 복사:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
3. `.env.local` 파일 생성:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## 4. 데이터 import (선택)

기존 Google Sheets 데이터를 Supabase로 옮기려면:
1. Google Sheets → CSV export
2. Supabase → Table editor → Import CSV
3. 컬럼명 자동 매핑

---

## 다음 단계

설정 완료 후 알려주면:
- 프론트엔드 코드 수정 (Supabase API 연동)
- GitHub Pages 배포
- `dashboard.bridge34.com` 연결
