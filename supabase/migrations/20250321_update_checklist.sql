-- チェックリストテーブルのカラムを更新
ALTER TABLE checklists DROP COLUMN IF EXISTS supplies;
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS chalk BOOLEAN DEFAULT FALSE;
