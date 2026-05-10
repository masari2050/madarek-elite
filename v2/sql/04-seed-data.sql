-- ============================================================
-- مدارك النخبة v7 — Migration 04
-- بيانات افتراضية (Seed Data)
-- ============================================================

-- ────────────────────────────────────────────
-- 1. الإنجازات (الشارات) — 6 شارات من الموك أب
-- ────────────────────────────────────────────
INSERT INTO achievements (name, description, icon, target_value, achievement_type, sort_order)
SELECT * FROM (VALUES
    ('المئوي',      'حل 100 سؤال',                    '💯', 100, 'questions', 1),
    ('الخطوة الأولى', 'إكمال 10 جلسات تدريبية',         '🎯', 10,  'sessions',  2),
    ('مستمر',       'التدريب 7 أيام متتالية',           '🔥', 7,   'streak',    3),
    ('متفوق',       'تحقيق دقة 80% أو أعلى',          '⭐', 80,  'accuracy',  4),
    ('لا يوقفك شيء', 'التدريب 30 يوم متتالي',          '🏆', 30,  'streak',    5),
    ('الخبير',      'إكمال 5 اختبارات كاملة',          '👑', 5,   'sessions',  6)
) AS v(name, description, icon, target_value, achievement_type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM achievements LIMIT 1);

-- ────────────────────────────────────────────
-- 2. البنرات الافتراضية (3 أنواع — كلها معطلة افتراضياً)
-- ────────────────────────────────────────────
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT * FROM (VALUES
    ('ticker'::text, false, '{"keyword":"جديد","keyword_color":"#FF6B35","text":"تسريبات أبريل 2026 متاحة الآن!","bg_color":"#1a1a2e","text_color":"#ffffff","speed":50,"pinned":false}'::jsonb, 1),
    ('image'::text,  false, '{"image_url":""}'::jsonb, 2),
    ('main'::text,   false, '{"tag":"اختبار محاكي","cta_text":"سجّل الآن","title":"اختبار محاكي أسبوعي","subtitle":"السبت القادم — 100 سؤال في 120 دقيقة","bg_left":"#6D5DF6","bg_right":"#4A3ACD","btn_color":"#FF6B35","btn_text_color":"#ffffff"}'::jsonb, 3)
) AS v(banner_type, is_active, config, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM banners LIMIT 1);

-- ────────────────────────────────────────────
-- 3. نصائح يومية افتراضية
-- ────────────────────────────────────────────
INSERT INTO tips (emoji, title, body, sort_order)
SELECT * FROM (VALUES
    ('⏰', 'نظّم وقتك',         'خصص 30 دقيقة يومياً للتدريب — الاستمرارية أهم من الكثافة', 1),
    ('🎯', 'ركّز على الضعف',    'راجع أخطاءك أولاً — التعلم من الخطأ أسرع طريق للتحسن',    2),
    ('📊', 'تابع تقدمك',       'راقب إحصائياتك أسبوعياً — الأرقام ما تكذب',               3),
    ('🧠', 'افهم لا تحفظ',     'فهم طريقة الحل أفضل من حفظ الإجابة — الأسئلة تتغير لكن المنطق ثابت', 4),
    ('💪', 'لا تستسلم',        'كل خبير كان مبتدئ — المثابرة هي الفارق',                  5)
) AS v(emoji, title, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM tips LIMIT 1);

-- ────────────────────────────────────────────
-- 4. صفحات افتراضية
-- ────────────────────────────────────────────
INSERT INTO pages (slug, title, description, content)
SELECT * FROM (VALUES
    ('privacy', 'سياسة الخصوصية',  'سياسة الخصوصية لتطبيق مدارك النخبة', ''),
    ('terms',   'شروط الاستخدام',  'شروط استخدام تطبيق مدارك النخبة',    ''),
    ('about',   'عن التطبيق',     'معلومات عن تطبيق مدارك النخبة',      '')
) AS v(slug, title, description, content)
WHERE NOT EXISTS (SELECT 1 FROM pages LIMIT 1);

-- ────────────────────────────────────────────
-- 5. توليد referral_code للمستخدمين الحاليين (بدون كود)
-- ────────────────────────────────────────────
UPDATE profiles
SET referral_code = 'MADAR-' || UPPER(SUBSTR(MD5(id::text), 1, 5))
WHERE referral_code IS NULL;
