-- 92: Fix Kirchhoff's law question — physics correction + dedup
-- Two duplicate questions found about cold gas absorption:
--   - 6ca220b7 (is_top_repeated=true): had A=B typo + physics error in correct answer (says
--     "frequencies it absorbs" — tautological, not Kirchhoff's law).
--   - 334be403 (cleaner version): correctly worded "wavelengths it emits when excited".
-- Strategy: fix 6ca220b7 to match correct physics, disable 334be403 to remove duplicate.

BEGIN;

-- 1) Fix 6ca220b7: align with Kirchhoff's law (cold gas absorbs same λ it emits when excited)
UPDATE questions SET
  choices = '["الأطوال الموجية نفسها التي تمتصها عندما تثار", "الأطوال الموجية نفسها التي تبعثها عندما تثار", "الترددات الموجية المختلفة عن التي تبعثها عندما تثار", "مربع الترددات الموجية نفسها التي تبعثها عندما تثار"]'::jsonb,
  correct_index = 1,
  explanation = 'قانون كيرشوف: الغاز البارد يمتص نفس الأطوال الموجية التي يبعثها عند إثارته. هذا أساس أطياف الامتصاص: كل عنصر له بصمة طيفية مميّزة، تظهر كخطوط داكنة عند مرور الضوء الأبيض من خلاله، وكخطوط مضيئة عند إثارته.'
WHERE id = '6ca220b7-e66e-46ab-b638-2d5996a004b4';

-- 2) Disable the near-duplicate 334be403 (Bohr-themed version)
--    Reason: 6ca220b7 is marked is_top_repeated=true (preferred for marketing/study features).
UPDATE questions SET
  disabled = true
WHERE id = '334be403-0673-4d96-8890-9eb0b24329f8';

COMMIT;
