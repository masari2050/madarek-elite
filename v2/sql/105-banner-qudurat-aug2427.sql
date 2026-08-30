-- بنر تسريبات قدرات أيام 24 و26 و27 أغسطس — يقرأه dashboard الويب وتطبيق Expo من نفس الصف
-- الألوان: التدرج الرسمي المعتمد #4C1D95 → #7C3AED (قاعدة هوية v3)
-- الأرقام إنجليزية (قاعدة 2026-05-18) — بنر تسويقي وليس محتوى أسئلة
BEGIN;

UPDATE banners
SET is_active = true,
    schedule_start = NULL,
    schedule_end = '2026-09-06T20:59:00+00:00',
    config = jsonb_build_object(
      'tag', 'تسريبات القدرات',
      'link', '/leaks.html',
      'title', 'اختبارات 24 و26 و27 أغسطس',
      'title_accent', '27 أغسطس',
      'bg_left', '#4C1D95',
      'bg_right', '#7C3AED',
      'cta_text', 'افتح التسريبات الآن',
      'live_dot', true,
      'subtitle', '286 سؤالاً جديداً من ثلاثة أيام اختبار — كمي ولفظي بشروح مبسطة لكل سؤال',
      'btn_color', '#FFFFFF',
      'day_badge', 'جديد',
      'decorations', true,
      'btn_text_color', '#5B21B6'
    ),
    updated_at = now()
WHERE banner_type = 'main';

DO $chk$
DECLARE t TEXT;
BEGIN
  SELECT config->>'title' INTO t FROM banners WHERE banner_type = 'main' LIMIT 1;
  RAISE NOTICE 'بنر main الآن: %', t;
END
$chk$;

COMMIT;
