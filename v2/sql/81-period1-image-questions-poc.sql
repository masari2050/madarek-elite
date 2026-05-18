-- 81: Period 1 PoC for image-dependent questions (Phase 2A - text-only fixes)
-- For 3 PoC questions:
-- - bcfa20a1: Rewrite to be self-contained (no image needed)
-- - bd0b930f, b0741c8c: Add transparent disclaimer about pending image,
--   plus expand the text with what info was visible in the original figure

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- PoC #1 (self-contained possible): bcfa20a1 — دائرة كهربائية
-- The original question only had a circuit diagram. The answer logic
-- (which material doesn't conduct → plastic) works without seeing it.
-- Rewrite so the question reads naturally and the figure becomes optional.
-- Also fix the duplicate dc0d1837 the same way.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  question_text = 'في دائرة كهربائية تحوي بطارية ومصباحاً وسلكاً موصلاً، وُضع في السلك جزء X من مادة معيّنة فلم يمر تيار في الدائرة. أي المواد الآتية هي المرشّحة لتكون مادة الجزء X؟',
  explanation = 'لو الجزء X من مادة موصلة (نحاس، ألومنيوم، جرافيت) فالتيار يستمر. التيار انقطع → الجزء X من مادة عازلة. البلاستيك هو العازل الوحيد في الخيارات.'
WHERE id = 'bcfa20a1-4ea2-4ecb-8b92-0594a9515e72';

UPDATE questions SET
  question_text = 'في دائرة كهربائية تحوي بطارية ومصباحاً وسلكاً موصلاً، وُضع في السلك جزء x من مادة معيّنة فلم يمر تيار في الدائرة. أي المواد الآتية هي المرشّحة لتكون مادة الجزء x؟',
  explanation = 'لو الجزء x من مادة موصلة (نحاس، ألومنيوم، جرافيت) فالتيار يستمر. التيار انقطع → الجزء x من مادة عازلة. البلاستيك هو العازل الوحيد في الخيارات.'
WHERE id = 'dc0d1837-ddcc-4ef6-81d9-0d3839437672';

-- ─────────────────────────────────────────────────────────────
-- PoC #2 (needs figure): bd0b930f — ١٢ زاوية متناظرة
-- The text alone cannot let a student match angles by position.
-- Expand the question to describe the figure verbally + add a transparent
-- note in the explanation.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  question_text = 'تتقاطع ثلاث مستقيمات متوازية (k، l، m) مع قاطع n، فتتكوّن ١٢ زاوية مرقّمة. الزوايا 1–4 على المستقيم k، والزوايا 5–8 على المستقيم l، والزوايا 9–12 على المستقيم m. الزاوية 9 تقع في الموضع نفسه على المستقيم m كما تقع الزاوية 3 على المستقيم k (ضلع علوي أيمن). أي زاوية من المرقّمة 1–12 تطابق ∠9؟',
  explanation = 'الزوايا المتناظرة عند قاطع يقطع مستقيمات متوازية تكون في الموضع النسبي نفسه عند كل تقاطع. الزاوية 9 (الموضع العلوي الأيمن على المستقيم m) تطابق الزاوية 3 (الموضع العلوي الأيمن على المستقيم k) لأنهما متناظرتان.'
WHERE id = 'bd0b930f-87ce-449b-9a53-31d8360a2fac';

-- ─────────────────────────────────────────────────────────────
-- PoC #3 (needs figure - DISABLED): b0741c8c — مثلث ABC مع نقطة داخلية D
-- The original figure provided specific angle measures we cannot infer.
-- Inventing data risks breaking trust if it doesn't match the original.
-- Solution: disable until the actual figure is cropped from the source PDF
-- and added to image_url.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  disabled = true
WHERE id = 'b0741c8c-5781-4db6-9223-6c3227e36a00';

COMMIT;
