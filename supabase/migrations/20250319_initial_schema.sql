-- journals テーブル（日誌の基本情報）
CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE NOT NULL,
  weather TEXT NOT NULL,
  day_type TEXT NOT NULL,
  class_name TEXT NOT NULL,
  daily_rep_1 TEXT,
  daily_rep_2 TEXT,
  next_daily_rep_1 TEXT,
  next_daily_rep_2 TEXT,
  daily_comment TEXT,
  teacher_comment TEXT,
  substitute TEXT
);

-- periods テーブル（講義情報）
CREATE TABLE periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  subject TEXT,
  teacher TEXT,
  content TEXT,
  absences TEXT,
  in_out TEXT,
  is_night BOOLEAN DEFAULT FALSE
);

-- checklists テーブル（チェックリスト情報）
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  pc BOOLEAN DEFAULT FALSE,
  mic BOOLEAN DEFAULT FALSE,
  prints BOOLEAN DEFAULT FALSE,
  journal BOOLEAN DEFAULT FALSE,
  supplies BOOLEAN DEFAULT FALSE
);

-- インデックスの作成
CREATE INDEX idx_journals_date ON journals(date);
CREATE INDEX idx_periods_journal_id ON periods(journal_id);
CREATE INDEX idx_checklists_journal_id ON checklists(journal_id);

-- RLSポリシーの設定（実際のアプリでは認証を実装する場合に設定）
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセスできるポリシー（認証を実装しない場合）
CREATE POLICY "全ユーザーがjournalsにアクセス可能" ON journals FOR ALL USING (true);
CREATE POLICY "全ユーザーがperiodsにアクセス可能" ON periods FOR ALL USING (true);
CREATE POLICY "全ユーザーがchecklistsにアクセス可能" ON checklists FOR ALL USING (true);
