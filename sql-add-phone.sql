-- إضافة عمود رقم الجوال لجدول profiles
-- نفّذ هذا في Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
