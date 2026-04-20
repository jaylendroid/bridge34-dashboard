-- Bridge34 Dashboard: Client Map 고도화
-- Supabase SQL Editor에서 실행하세요

-- 미팅 일지
CREATE TABLE IF NOT EXISTS meetings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  meeting_date date NOT NULL,
  attendees text,
  summary text,
  next_action text,
  created_at timestamptz DEFAULT now()
);

-- 주요 컨택
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  name text NOT NULL,
  role text,
  telegram text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 딜 스트럭쳐
CREATE TABLE IF NOT EXISTS client_deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  deal_title text,
  amount text,
  structure text,
  status text DEFAULT '논의중',
  notes text,
  created_at timestamptz DEFAULT now()
);
