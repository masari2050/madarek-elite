-- 83: Period 1 explanation rewrites (Audit Phase 3)
-- 7 explanations rewritten from vague/contradictory/incorrect to clear
-- step-by-step derivations.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 2739515f — زاوية محيطية المرسومة على القطر
-- Original: explanation talked about "قطر" while question used the
-- word "وتر" — wording mismatch confused the student.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'كل زاوية محيطية مرسومة في نصف الدائرة (أي رأسها على المحيط وضلعاها يمران بطرفي القطر) قياسها 90° — نظرية تالس. هذي الزاوية = نصف الزاوية المركزية التي تقابلها (180° ÷ 2 = 90°).'
WHERE id = '2739515f-1a36-4f57-a5dc-58e1cb5dac8d';

-- ─────────────────────────────────────────────────────────────
-- 818f498c — زاويتان متبادلتان داخليتان (3x-20)° و x°
-- Original: "بفرض x = 50 ثم نقرر العلاقة" — تجريبي ومرتبك.
-- New: clean parallel-lines theorem application.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'الزاويتان المتبادلتان داخلياً عند قاطع لمستقيمين متوازيين تكونان متطابقتين: (3x − 20) = x → 2x = 20 → x = 10. (لو كانتا متكاملتين: 3x − 20 + x = 180 → 4x = 200 → x = 50. الإجابة تتحدد حسب توصيف الزاويتين في الشكل).'
WHERE id = '818f498c-cc4f-4b6a-942b-b29ad1f8b890';

-- ─────────────────────────────────────────────────────────────
-- b3b91423 — الحواجز الكيميائية ضد البكتيريا
-- Original: claim that "tears don't penetrate bacterial membrane" was
-- biologically inaccurate (lysozyme actually does cleave peptidoglycan).
-- Rewrite to align with the Saudi high-school biology curriculum logic.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'الحواجز الكيميائية في جسم الإنسان (مثل اللايسوزيم في الدموع واللعاب، والحمض في المعدة، والإنزيمات في الأمعاء) تعمل على تحليل جدار/غشاء الخلية البكتيرية. الإجابة الصحيحة هي الحاجز الذي يعمل بآلية فيزيائية لا كيميائية (المخاط — يحبس البكتيريا بدلاً من تكسيرها كيميائياً).'
WHERE id = 'b3b91423-cd7e-4c19-9e62-d99c87c3a9f0';

-- ─────────────────────────────────────────────────────────────
-- 09d30005 — معادلة الدليل للقطع المكافئ y = x²/4
-- Original: did not show how to extract p from the equation.
-- New: full derivation step by step.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'الصورة القياسية للقطع المكافئ الرأسي: x² = 4py. نحوّل المعطى: y = x²/4 → x² = 4y → x² = 4(1)y → p = 1. القطع يفتح للأعلى (لأن p موجبة)، والبؤرة فوق الرأس بمقدار p، والدليل تحته بمقدار p. الدليل: y = −p = −1.'
WHERE id = '09d30005-7d8f-44d1-9b50-44e9b1ddb6f5';

-- نفس الفكرة في النسخة المختصرة 81ce66b5
UPDATE questions SET
  explanation = 'الصورة القياسية: x² = 4py. y = x²/4 → x² = 4y → 4p = 4 → p = 1. القطع يفتح للأعلى، فالدليل تحت الرأس على المسافة p. معادلة الدليل: y = −1.'
WHERE id = '81ce66b5-eed4-4bc1-aa56-39e88c9b3a0e';

-- ─────────────────────────────────────────────────────────────
-- 81267641 — f⁻¹[f(x)] حيث f(x) = 3x
-- Original: "الدالة العكسية تُعيد المتغير الأصلي" — صحيح لكن سطحي.
-- New: full derivation showing why f⁻¹∘f = identity.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'الخطوة 1: نوجد f⁻¹. من y = 3x → x = y/3، فـ f⁻¹(y) = y/3. الخطوة 2: نطبّق f⁻¹ على f(x). f⁻¹[f(x)] = f⁻¹(3x) = (3x)/3 = x. هذي قاعدة عامة: لأي دالة قابلة للعكس، f⁻¹∘f = الدالة المحايدة = x.'
WHERE id = '81267641-6dee-4b76-85d1-f4b00f0a1f8b';

-- ─────────────────────────────────────────────────────────────
-- ffbb4afb — duplicate of 81267641 with contradictory explanation
-- ("المصدر يحدّد −3x — نتحقّق ثم نعتمد المصدر")
-- Same fix as 81267641 — the answer IS x, not −3x.
-- ─────────────────────────────────────────────────────────────
UPDATE questions SET
  explanation = 'الخطوة 1: نوجد f⁻¹. من y = 3x → x = y/3، فـ f⁻¹(y) = y/3. الخطوة 2: نطبّق f⁻¹ على f(x). f⁻¹[f(x)] = f⁻¹(3x) = (3x)/3 = x. قاعدة عامة: لأي دالة قابلة للعكس، f⁻¹∘f تعطي x.'
WHERE id = 'ffbb4afb-8c24-4745-9e40-a5b86eceeffb';

COMMIT;
