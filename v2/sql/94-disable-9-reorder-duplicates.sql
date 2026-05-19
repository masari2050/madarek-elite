-- 94: Disable 9 strict-text duplicates with reordered choices
-- The earlier dedup (SQL 93) skipped these because correct_index differed,
-- but inspection showed the correct CHOICE TEXT is identical in all 9 pairs —
-- only the array ordering differs. Same policy as 93: keep top_repeated/leak version.

BEGIN;

UPDATE questions SET disabled = true WHERE id IN (
  '2893f56d-a688-4695-8cc7-74f14f49421e',  -- الفرمونات (kept: c73bdded, top=T)
  '7d7c0e5f-f4a0-4892-b32c-038ea1fc7ac8',  -- ميل منحنى v-t (kept: 42cc72c6, leak=T)
  '9b96cf3e-bd68-4d5e-acde-4ca1f492590b',  -- السرخسيات (kept: 519e8a1d, leak=T)
  '98103b98-e6b5-419b-810b-c05b51b7c9d7',  -- مكوّنات النجوم بلازما (kept: 60df3c3e, top=T)
  '666aae9a-94ac-4026-99c0-721b24476ea8',  -- معدل تغير السرعة = التسارع (kept: 73bc0609, leak=T)
  'e278585c-a525-401c-b6f2-f8c9c5be4b31',  -- العقارب رئات كتبية (kept: 7badc391, top=T)
  '8abaf6a1-62c6-4ac2-845e-d5520aa51e44',  -- الصفة الكميّة (both top=T, kept first by id: b4b89387)
  '9b5a6708-504d-4e3c-80ae-6d70b73fafc2',  -- التجربة (kept: 8effa813, leak=T)
  'bcfa20a1-4ea2-4ecb-8b92-0594a9515e72'   -- الدائرة الكهربائية (both leak, kept: dc0d1837)
);

COMMIT;
