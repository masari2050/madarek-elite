-- ============================================
-- Migration 15: Auto-generate referral_code for new profiles
-- ============================================
-- يُنشئ trigger يولّد referral_code فريدًا لكل صف جديد في profiles
-- إذا لم يحدّده التطبيق صراحةً. آمن للإعادة (idempotent).

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR LENGTH(TRIM(NEW.referral_code)) = 0 THEN
    -- حتى 5 محاولات لتفادي تصادم نادر مع كود موجود
    FOR i IN 1..5 LOOP
      NEW.referral_code := 'MADAR-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 5));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE referral_code = NEW.referral_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_referral_code ON public.profiles;
CREATE TRIGGER trg_gen_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.gen_referral_code();


-- ====== تحقّق ======
-- 1) التأكد من تثبيت الـ trigger
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_schema='public'
  AND event_object_table='profiles'
  AND trigger_name='trg_gen_referral_code';

-- 2) عدد الصفوف التي بدون كود (يُفترض = 0 بعد SQL 04)
SELECT COUNT(*) AS profiles_without_referral_code
FROM public.profiles
WHERE referral_code IS NULL;
