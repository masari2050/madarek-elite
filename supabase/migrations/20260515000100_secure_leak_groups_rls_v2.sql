-- 🚨 إصلاح أمني عاجل — RLS على leak_groups (v2)
BEGIN;

ALTER TABLE leak_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leak_groups_select_all" ON leak_groups;
DROP POLICY IF EXISTS "leak_groups_admin_insert" ON leak_groups;
DROP POLICY IF EXISTS "leak_groups_admin_update" ON leak_groups;
DROP POLICY IF EXISTS "leak_groups_admin_delete" ON leak_groups;
DROP POLICY IF EXISTS "Enable read access for all users" ON leak_groups;
DROP POLICY IF EXISTS "Enable update for all" ON leak_groups;
DROP POLICY IF EXISTS "Enable insert for all" ON leak_groups;
DROP POLICY IF EXISTS "Enable delete for all" ON leak_groups;

CREATE POLICY "leak_groups_select_all"
    ON leak_groups FOR SELECT USING (true);

CREATE POLICY "leak_groups_admin_insert"
    ON leak_groups FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "leak_groups_admin_update"
    ON leak_groups FOR UPDATE
    USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "leak_groups_admin_delete"
    ON leak_groups FOR DELETE USING (is_admin());

-- إعادة ضبط العداد للقيمة الصحيحة
UPDATE leak_groups SET pdf_downloads = 1
WHERE id = 'cfaf82ac-dc99-43ac-8d00-d44133802245';

COMMIT;

-- تحقق
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'leak_groups' ORDER BY policyname;
