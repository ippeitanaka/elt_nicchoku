-- journalsテーブルに清掃担当班のカラムを追加
ALTER TABLE journals ADD COLUMN current_cleaning_duty TEXT;
ALTER TABLE journals ADD COLUMN next_cleaning_duty TEXT;
