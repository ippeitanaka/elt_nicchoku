-- チェックリストテーブルの構造を更新
ALTER TABLE checklists 
  RENAME COLUMN chalk TO prints;

-- 新しい列を追加
ALTER TABLE checklists 
  ADD COLUMN supplies BOOLEAN DEFAULT false;
