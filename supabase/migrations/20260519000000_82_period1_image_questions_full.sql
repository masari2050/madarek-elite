-- 82: Period 1 image-dependent questions — full Phase 2A pass
-- Of the 23 figure-dependent questions (after PoC handled 3 in SQL 81):
--   8 are now reachable by rewriting the text to be self-contained
--   11 genuinely need the figure → disabled until images cropped (Phase 2B)
--   (4 already handled by SQL 81)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- STRATEGY A — Rewrite to be self-contained (text alone sufficient)
-- ═══════════════════════════════════════════════════════════════════════

-- 0d8ac3ba — مثلث قائم: sinθ + cosθ + Pythagoras → الوتر = 1
-- The current text is already self-contained — no edit needed.
-- (Documented here for completeness only.)

-- dd11c5af — كرة طاقة وضع 200J وارتفاع 10m → m = 2 kg
UPDATE questions SET
  question_text = 'كرة لها طاقة وضع 200 جول عند ارتفاع 10 متراً عن سطح الأرض. ما كتلة الكرة بوحدة الكيلوجرام؟ (g = 10 m/s²)'
WHERE id = 'dd11c5af-b3fa-46e9-b534-b6822eba6d03';

-- 1fc4573f — خطان متقاطعان عند E، زوايا 30 و 110 و x على نفس المستقيم
UPDATE questions SET
  question_text = 'تقاطع مستقيمان عند نقطة E. على أحد المستقيمين تقع ثلاث زوايا متجاورة قياساتها على الترتيب: 110°، 30°، x°. أوجد قيمة x.',
  explanation = 'الزوايا الثلاث على مستقيم واحد، فمجموعها يساوي 180°. إذاً: 110 + 30 + x = 180 → x = 40°.'
WHERE id = '1fc4573f-77c4-42dc-9ab2-2021671ec737';

-- c5f2fdba — دائرة نصف قطرها 2 حول الأصل (نظام قطبي)
UPDATE questions SET
  question_text = 'أي معادلة قطبية تمثل دائرة نصف قطرها 2 ومركزها الأصل (القطب) في النظام الإحداثي القطبي؟'
WHERE id = 'c5f2fdba-27e5-45a5-8abd-08faf10af7ad';

-- 9cd6cea9 — نابض، كتلة m تستطيل x، كتلة w تستطيل 2x → w = 2m
UPDATE questions SET
  question_text = 'نابض رأسي إذا عُلّقت فيه كتلة m استطال بمقدار x، وإذا عُلّقت فيه كتلة w استطال بمقدار 2x. ما قيمة الكتلة w بدلالة m؟'
WHERE id = '9cd6cea9-c7b3-404c-8139-bcd47c1ecc38';

-- a6e10b6d — duplicate of 9cd6cea9
UPDATE questions SET
  question_text = 'نابض رأسي إذا عُلّقت فيه كتلة m استطال بمقدار x، وإذا عُلّقت فيه كتلة w استطال بمقدار 2x. ما قيمة الكتلة w بدلالة m؟'
WHERE id = 'a6e10b6d-ffa4-417f-9742-474a7ce243c5';

-- e61f3ecd — مثلث منفرج الزاوية → الزاوية المنفرجة أكبر من 90°
UPDATE questions SET
  question_text = 'إذا كان مثلث منفرج الزاوية فيه زاوية قياسها x°، ما الشرط الذي يجب توفّره في x لتكون هي الزاوية المنفرجة؟',
  explanation = 'تعريف الزاوية المنفرجة: قياسها أكبر من 90° وأقل من 180°. الشرط: x > 90.'
WHERE id = 'e61f3ecd-67f1-4aea-b86a-f41be63eeb2e';

-- 30f0aa18 — فصيلة الدم AB (معرفة عامة في أحياء)
UPDATE questions SET
  question_text = 'فصيلة الدم AB تحتوي على مولّدَي الضد A و B. أي فصائل الدم الآتية تستقبل دماً من شخص فصيلته AB؟',
  explanation = 'فصيلة AB تحتوي مولّدي ضد (A و B)، فلا يستقبلها إلا من لا يحمل أجساماً مضادة لأيٍّ منهما، وهذا فقط شخص فصيلته AB.'
WHERE id = '30f0aa18-2b54-4d0d-80d8-97e015ad8e1f';

-- ae3852b2 — الزخم لكرة من C إلى A ثم B (وصف الحركة كافي بدون صورة)
UPDATE questions SET
  question_text = 'كرة بدأت من السكون عند نقطة عالية C، تسارعت أثناء نزولها على منحدر حتى وصلت قاع المنحدر عند النقطة A، ثم تابعت حركتها على سطح أفقي خشن فتباطأت تدريجياً حتى توقّفت تماماً عند النقطة B. أي العبارات التالية صحيحة عن زخم الكرة؟',
  explanation = 'الزخم p = m × v. عند C الكرة ساكنة (v=0) فالزخم = 0. عند A سرعتها أكبر ما يمكن (نهاية التسارع) فالزخم أعظمي. عند B السرعة = 0 (توقّفت) فالزخم = 0. الإجابة: الزخم أكبر ما يمكن عند A.'
WHERE id = 'ae3852b2-9120-4bc5-83c3-f82196628e2d';

-- ═══════════════════════════════════════════════════════════════════════
-- STRATEGY C — Genuinely figure-dependent → disable until image uploaded
-- ═══════════════════════════════════════════════════════════════════════

UPDATE questions SET disabled = true WHERE id IN (
  '198edf0e-cb8a-42b4-ac83-29af15fe174b',  -- مثلث بـ7 زوايا 130/100/30/4/2/3/1
  '057341ff-3b35-4c3e-8bca-ad18b9a7bdd2',  -- 3 شحنات + خطوط مجال
  '3214c906-b2bf-42fd-863e-6f7472d02bff',  -- منحنى تحمّل المخلوقات الحية
  '159cfd72-ba10-4e30-99f8-83391d673638',  -- دوبلر سيارتين (يحتاج سرعتيهما)
  'cd4a809b-191f-4365-948f-3f3c32e73586',  -- اتزان قوى F + cos30
  'b8227d43-6109-4c2f-b986-e4e18878c647',  -- منحنى سرعة-زمن 4 مراحل
  '33da53a0-7320-4814-ba7e-96323b37e6e2',  -- مخطط حالة (النقطة الحرجة)
  '5e25b642-d666-4393-a50f-010ee9429e89',  -- الـHydra والسهم
  'cd83769d-2fcc-46cc-ad6e-d678bba7631a',  -- شبكة كائنات (شبكة غذائية)
  '6a6edfda-c0bb-4e46-b5b7-707fb522f93b',  -- عظمة طويلة + موقع السمحاق
  '9d57806a-ce79-44b2-9bd8-f1e92bdf1c53'   -- عظم طويل + السهم
);

COMMIT;
