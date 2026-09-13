-- ═══════════════════════════════════════════════════════════════
-- مراجعة وكلاء الجودة لتسريبات 6-10 سبتمبر: 43 تعديلاً + 3 حذفاً + تحديث نص قطعة
-- كل تعديل مقيّد بالـid ومتحقق أنه لمس صفاً واحداً بالضبط. نسخة احتياطية: backup_2026_09_13.questions_review_before
-- ═══════════════════════════════════════════════════════════════
BEGIN;

CREATE SCHEMA IF NOT EXISTS backup_2026_09_13;
CREATE TABLE IF NOT EXISTS backup_2026_09_13.questions_review_before AS SELECT * FROM questions WHERE id IN ('008926ed-b780-4bfc-a7b3-c3d1a85f605f','03667769-01d4-42b1-bcd9-c76e22d78e6d','06b01c6d-5147-4af2-9997-0bd616099048','1129e5ed-80f4-4ba0-ad54-5022ae5bc16c','1581c133-e0b2-4a00-be1b-72b6a5cc2913','1965822b-fc1a-4ee5-8f7a-645be0d8c100','1c401471-1c23-4be5-9197-4ddac77bc2ed','3b25a71e-8898-4b52-926f-3b87117aeb55','4a946120-77a0-4af6-af48-9e47c5a7e5dd','4b27108a-3182-4cb4-b1d8-9ca05a929a89','57761bf7-9277-4789-b972-bbef15bca0f5','5955518c-2bcc-47ec-884d-3760211be8aa','60272f62-d219-4c61-a01e-9408575a6063','63c59da6-1b37-4320-90c6-1b5500c8222e','69e067f0-a25a-4bbe-a6e4-42a30055afba','6a5c6a08-027f-4d8b-a25c-1c22fd00e95d','6f87346c-06f6-4ddc-b125-fc5f8a3371ce','7b1449b6-4a53-4cd8-9413-64e56ca860ae','7ddd79e0-22c3-4324-bee0-8e86ef068b5d','88cb94ff-41eb-449e-9162-5b7ca3ccdd45','8a1b889d-4c6c-4b79-abe2-606c676bfeff','90a28c48-3afe-4de2-be43-702c62e85390','92dcf407-84d7-44e2-b13e-44db7afc59f4','9a6b1875-0ba7-4cc9-b163-23d078563132','a05283e9-5a34-4e90-9348-fdf3176fa3bb','a2784d77-1128-49aa-80da-40987da39ec0','a3129d14-e491-4139-97aa-220434b1ee49','a849a6b2-d368-4fff-a138-00366cf071de','b066b1f9-577b-4e1e-8fc3-1abce0e6e079','b1f7acf0-7b1b-4a21-ab55-366044f0fc0c','b532df45-5726-4887-b519-166a35f07d58','bf6bc7f3-ecaf-4407-87da-40afa0d7a40a','c6aaa0ae-4efb-4390-ada0-f857441a6597','c8a487a3-4247-437e-adeb-1df80ff7706f','ccec080c-1944-4496-8d63-e5cb2df07a60','ce737cec-7284-4653-b6ce-1af2e8560e4f','d3a038b6-9bde-4fb5-acd3-4fbe306267e0','d40632fe-7a0e-4612-8c5a-9e7031fe3512','d93aa392-ae3e-4816-8bce-a5230d9ad68d','d994e10a-68ac-4cff-969b-1955039eca57','e0e74196-2640-4eb5-acdf-4bb70c146b70','ee4e4fed-6c05-4eef-b100-7908413241c0','eeffd47b-968c-43b7-9238-3c72b724f156','f4c950e8-8b4e-4cca-bcb7-5c12d5917210','f62f2caf-6332-47f5-9582-bbb456d45874','f6343c60-646d-470d-9b2e-28ea3d378c9a','ff3bce7a-a847-41a8-b083-ad6093a41452');

DO $rv$
DECLARE n INT;
BEGIN
  -- mon:yalo_mon#13: السؤال يشير لشكل غير موجود
  UPDATE questions SET question_text = 'ما شكل قاعدة الأسطوانة؟' WHERE id = 'e0e74196-2640-4eb5-acdf-4bb70c146b70';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#13: % صف', n; END IF;
  -- mon:yalo_mon#2: قراءة بديلة (كل موقف بلون) تعطي أزرق
  UPDATE questions SET question_text = 'موقف سيارات يسع ٤٣٢ سيارة مقسّم إلى ستة أجزاء، كل جزء مكوّن من ٧٢ موقفًا بلون واحد، والأجزاء مرتبة حسب اللون بالترتيب: أحمر – أبيض – أخضر – أصفر – أسود – أزرق. ما لون الموقف رقم ٣٦٠؟' WHERE id = 'c8a487a3-4247-437e-adeb-1df80ff7706f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#2: % صف', n; END IF;
  -- sun:yalo_sun#6: المربع مستطيل أيضاً فالتساوي ممكن
  UPDATE questions SET question_text = 'إذا كان محيط مربع يساوي محيط مستطيل غير مربع، قارن بين:
القيمة الأولى: مساحة المربع
القيمة الثانية: مساحة المستطيل', explanation = 'عند تساوي المحيط تكون مساحة المربع أكبر من مساحة أي مستطيل غير مربع. جرّب محيطًا ١٦: مربع ضلعه ٤ مساحته ١٦، ومستطيل ٥ × ٣ مساحته ١٥ فقط.' WHERE id = '1581c133-e0b2-4a00-be1b-72b6a5cc2913';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#6: % صف', n; END IF;
  -- mon:yalo_mon#19: يشير لجدول غير معروض
  UPDATE questions SET question_text = 'القروض بالمليارات لأربع دول (استهلاكية ثم عقارية): السعودية ٢٧٦ و٨٦، قطر ٢٥٠ و١٨٥، الإمارات ٢٧٢ و٢٥٦، البحرين ٢٤٢ و١٧٥. ما الدولة التي بها أعلى قروض عقارية؟' WHERE id = '63c59da6-1b37-4320-90c6-1b5500c8222e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#19: % صف', n; END IF;
  -- thu:hemma_thu#216: أرقام المصدر (مثلث ٣٠ ودائرة ٤٠π) تعطي مساحة سالبة — عُدّلت مساحة المثلث إلى ٤٠ المتسقة مع الشكل
  UPDATE questions SET question_text = 'في الشكل المجاور: مثلث رأس زاويته القائمة هو مركز الدائرة. إذا علمت أن مساحة الدائرة ٤٠π ومساحة المثلث ٤٠، فأوجد مساحة الجزء المظلل.', choices = '["٤٠ − ٤٠π", "٤٠ − ١٠π", "٤٠π + ٤٠", "١٠π + ٤٠"]'::jsonb, explanation = 'الزاوية القائمة عند المركز تحصر داخل المثلث ربع الدائرة بالضبط، ومساحته ٤٠π ÷ ٤ = ١٠π. المظلل هو ما بقي من المثلث خارج الدائرة = ٤٠ − ١٠π (≈ ٨٫٦). والطريقة ثابتة مهما تغيّرت الأرقام: المظلل = مساحة المثلث − ربع مساحة الدائرة.' WHERE id = '008926ed-b780-4bfc-a7b3-c3d1a85f605f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:hemma_thu#216: % صف', n; END IF;
  -- wed:yalo_wed#23: ترتيب الرؤوس السابق يعطي نسبتين متناقضتين ويسمح بجواب ٢٤
  UPDATE questions SET question_text = 'المثلث د أ ج يشابه المثلث أ ج ب بهذا الترتيب للرؤوس، وفيهما أ د = ١٦ سم، وأ ج = ٢٤ سم، وأ ب = ٣٠ سم. أوجد طول د ج.', explanation = 'من ترتيب الرؤوس: د أ يناظر أ ج، ود ج يناظر أ ب. نسبة التشابه = ١٦ : ٢٤ = ٢ : ٣، فـد ج = ٣٠ × ٢/٣ = ٢٠ سم.' WHERE id = '6f87346c-06f6-4ddc-b125-fc5f8a3371ce';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#23: % صف', n; END IF;
  -- thu:hemma_thu#212: بدون التوضيح يصح فهم الأعداد الرباعية فقط (٢٤)
  UPDATE questions SET question_text = 'كم عددًا يمكن تكوينه من الأرقام (١، ٢، ٣، ٥) بدون تكرار أي رقم، سواء كان العدد من رقم واحد أو رقمين أو ثلاثة أو أربعة أرقام؟' WHERE id = 'd40632fe-7a0e-4612-8c5a-9e7031fe3512';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:hemma_thu#212: % صف', n; END IF;
  -- thu:hemma_thu#213: مفتاح الرسم فيه «النفقات» وليست صنفاً، والمحور قد يُقرأ ريالات — أعيد رسمه
  UPDATE questions SET question_text = 'يبين الشكل المجاور عدد الوحدات المبيعة (بالآلاف) من أربعة أصناف في محل خلال أربعة أشهر. إذا كان سعر ٤ حبات خبز ٦ ريالات، فأوجد قيمة مبيعات الخبز في شهر شوال.', image_url = 'https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/question-figures/qudurat_sep10_q050_sales_v2.png' WHERE id = '8a1b889d-4c6c-4b79-abe2-606c676bfeff';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:hemma_thu#213: % صف', n; END IF;
  -- thu:yalo_thu#30: يشير لشكل غير موجود
  UPDATE questions SET question_text = 'زاويتان متتامتان إحداهما ٥٠° والأخرى ص. قارن بين:
القيمة الأولى: ٢ص
القيمة الثانية: ١٠٠' WHERE id = 'd93aa392-ae3e-4816-8bce-a5230d9ad68d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#30: % صف', n; END IF;
  -- thu:hemma_thu#218: خطأ تقريب في الشرح (٣٨٫٨)
  UPDATE questions SET explanation = '٧٧٧٧ ريالًا = ٧٧٧٫٧ دينار. عدد أوراق فئة ٢٠ = ٧٧٧٫٧ ÷ ٢٠ ≈ ٣٨٫٩، أي ٣٨ ورقة كاملة (٣٩ ورقة تحتاج ٧٨٠ دينارًا).' WHERE id = 'ee4e4fed-6c05-4eef-b100-7908413241c0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:hemma_thu#218: % صف', n; END IF;
  -- sun:hemma_sun_v#325: الخيار «ثمرة» بدل «تمرة» يجعل «نخلة» شاذة أيضاً
  UPDATE questions SET choices = '["شجرة", "نخلة", "تمرة", "بذرة"]'::jsonb, explanation = 'الشجرة والنخلة والبذرة نبات أو أصل نبات يُزرع وينمو، أما التمرة فثمرة تؤكل وهي ناتج النخلة.' WHERE id = 'bf6bc7f3-ecaf-4407-87da-40afa0d7a40a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:hemma_sun_v#325: % صف', n; END IF;
  -- sun:yalo_sun#114: الخيار المُكمَّل «العادات – الأخلاق» يصلح أيضاً
  UPDATE questions SET choices = '["الفنون – الناس", "العادات – الصخور", "السجايا – المزايا", "الطباع – النفوس"]'::jsonb WHERE id = 'c6aaa0ae-4efb-4390-ada0-f857441a6597';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#114: % صف', n; END IF;
  -- mon:yalo_mon#102: «مكتبة : رفوف» كلٌّ وجزؤه أيضاً
  UPDATE questions SET choices = '["قشر : برتقال", "مكتبة : دفتر", "فصل : ساحة", "غرفة : باب"]'::jsonb WHERE id = '4b27108a-3182-4cb4-b1d8-9ca05a929a89';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#102: % صف', n; END IF;
  -- mon:yalo_mon#125: الاستقلالية مذكورة في النص فكانت إجابة ثانية
  UPDATE questions SET choices = '["القراءة الصامتة أكثر فاعلية في تحقيق الأهداف من القراءة بصوت عالٍ", "القراءة الشفهية أكثر فاعلية في تحقيق الأهداف", "القراءة الشفهية أسرع في التعلم", "القراءة الصامتة تناسب الكبار فقط"]'::jsonb WHERE id = 'b1f7acf0-7b1b-4a21-ab55-366044f0fc0c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#125: % صف', n; END IF;
  -- mon:yalo_mon#126: نفس السبب
  UPDATE questions SET choices = '["القراءة الصامتة تساعد في تحقيق الأهداف", "القراءة الشفهية أنفع للطفل من الصامتة", "القراءة الشفهية لا فائدة منها", "الطفل لا يحتاج تعلم القراءة الصامتة مبكرًا"]'::jsonb WHERE id = 'ce737cec-7284-4653-b6ce-1af2e8560e4f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#126: % صف', n; END IF;
  -- mon:yalo_mon#127: نفس السبب
  UPDATE questions SET choices = '["استيعاب واستخلاص المفردات المطبوعة", "لا تتطلب تركيزًا من القارئ", "أكثر فاعلية من القراءة الشفهية في تلبية الأغراض", "تميّز وتفسّر الكلمات المطبوعة"]'::jsonb WHERE id = '90a28c48-3afe-4de2-be43-702c62e85390';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#127: % صف', n; END IF;
  -- mon:yalo_mon#130: «كثيرة التدقيق» يدعمها النص أيضاً
  UPDATE questions SET choices = '["تعطي متسعًا من الوقت للترجمة", "تخضع للمراجعة والتدقيق بعد نشرها", "تعتمد على أساليب المترجم ودقته", "استخدامها شائع"]'::jsonb WHERE id = '60272f62-d219-4c61-a01e-9408575a6063';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#130: % صف', n; END IF;
  -- mon:yalo_mon#131: «من ضروريات الحياة» يدعمها النص وتطابق مفتاح سؤال العنوان
  UPDATE questions SET choices = '["المشكلات والعقبات ملح الحياة", "المشكلات والعقبات يجب تجنبها", "المشكلات والعقبات من منغصات الحياة", "العقبات والصعوبات غير ضرورية"]'::jsonb WHERE id = '06b01c6d-5147-4af2-9997-0bd616099048';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#131: % صف', n; END IF;
  -- tue:yalo_tue#115: سقطت «ليست» من الجملة
  UPDATE questions SET question_text = 'مأساتك ليست السرعة في الوصول لهدفك، بل عدم وجود هدف تسعى إليه.' WHERE id = 'b066b1f9-577b-4e1e-8fc3-1abce0e6e079';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل tue:yalo_tue#115: % صف', n; END IF;
  -- wed:yalo_wed#126: السؤال يقتبس عبارة غير موجودة في القطعة
  UPDATE questions SET question_text = 'عبارة «من المسائل الكبرى» تدل على:', explanation = 'قوله «من المسائل الكبرى» يجعلها واحدة من عدة مسائل كبرى، فهناك مسائل كبرى أخرى غيرها.' WHERE id = 'f62f2caf-6332-47f5-9582-bbb456d45874';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#126: % صف', n; END IF;
  -- wed:yalo_wed#130: الخيار ب كان يحتمل المعنى المقصود
  UPDATE questions SET choices = '["نظر القاضي في القضية بموضوعية", "تميّز المقال بالموضوعية فلم يخرج كاتبه عن موضوعه", "ناقشت هذا الموضوع بإسهاب", "الموضوع مهم للجميع"]'::jsonb WHERE id = 'b532df45-5726-4887-b519-166a35f07d58';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#130: % صف', n; END IF;
  -- wed:yalo_wed#119: الخيار المُكمَّل «تكثر» يعطي تصويباً ثانياً صحيحاً
  UPDATE questions SET choices = '["مواصلتك", "لك", "مجلس", "يتمنون"]'::jsonb WHERE id = '03667769-01d4-42b1-bcd9-c76e22d78e6d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#119: % صف', n; END IF;
  -- thu:yalo_thu#116: نُسخت «حسيًّا» بدل «حسيبًا» فاختفى الخطأ المقصود
  UPDATE questions SET question_text = 'من كان في خواطره ومجالات فكره دنيئًا حسيبًا لم يكن في سائر أمره إلا كذلك.', choices = '["خواطره", "فكره", "حسيبًا", "سائر"]'::jsonb, explanation = 'الحسيب هو الشريف ذو الحسب، ولا يجتمع مع الدناءة؛ فالخطأ في «حسيبًا» والصواب «خسيسًا».' WHERE id = '4a946120-77a0-4af6-af48-9e47c5a7e5dd';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#116: % صف', n; END IF;
  -- thu:yalo_thu#104: الخياران المُكمَّلان كانا يحتملان علاقة أخرى
  UPDATE questions SET choices = '["الإمارات : البرازيل", "الكويت : تونس", "سوريا : الأردن", "مصر : السودان"]'::jsonb WHERE id = '88cb94ff-41eb-449e-9162-5b7ca3ccdd45';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#104: % صف', n; END IF;
  -- thu:yalo_thu#107: «غيرك – سلامتها» و«أصدقائك – سلامتها» بمعنى المفتاح
  UPDATE questions SET choices = '["غيرك – شهرتها", "أصدقائك – قِدَمها", "الآخرين – صحتها", "نفسك – فشلها"]'::jsonb, explanation = 'المعنى: لا تتبع قناعات الآخرين قبل أن تثبت التجارب صحتها. أما الشهرة والقِدَم فلا يثبتان صواب القناعة، و«فشلها» يناقض أول الجملة.' WHERE id = '1c401471-1c23-4be5-9197-4ddac77bc2ed';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#107: % صف', n; END IF;
  -- sun:hemma_sun_v#308: «حزن : بكاء» سبب ونتيجة أيضاً
  UPDATE questions SET choices = '["برودة : سخونة", "دواء : شفاء", "خوف : خشية", "حزن : أسى"]'::jsonb WHERE id = 'd994e10a-68ac-4cff-969b-1955039eca57';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:hemma_sun_v#308: % صف', n; END IF;
  -- sun:yalo_sun#106: «ثرية» خطأ نسخ، و«تاريخ : أحداث» يحتاج توضيحاً
  UPDATE questions SET choices = '["رمال : صحراء", "فضاء : كواكب", "تاريخ : أحداث", "تلفزيون : مذياع"]'::jsonb, explanation = 'العلاقة: مكان وما يوجد فيه ويميزه. الجاذبية توجد في الأرض، والكواكب توجد في الفضاء. أما التاريخ فليس مكانًا، والأحداث مادته نفسها.' WHERE id = '57761bf7-9277-4789-b972-bbef15bca0f5';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#106: % صف', n; END IF;
  -- sun:yalo_sun#130: «مجداف» الوحيد المصنوع فكان قاعدة ثانية
  UPDATE questions SET choices = '["حافر", "زعنفة", "جناح", "منقار"]'::jsonb, explanation = 'الحافر والزعنفة والجناح أعضاء للحركة على الأرض أو في الماء أو الهواء، أما «المنقار» فعضو للأكل والالتقاط.' WHERE id = '3b25a71e-8898-4b52-926f-3b87117aeb55';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#130: % صف', n; END IF;
  -- sun:yalo_sun#116: الشرح لم يوضح استبعاد الزوجين المتقاربين
  UPDATE questions SET explanation = 'الجملة تشبيه بالظل، والظل يظهر في الشمس ويختفي في الظلام؛ فالإكمال الملائم لصورة التشبيه: الشمس – الظلام. أما «اليسر – العسر» و«الغنى – الفاقة» فمعناهما واحد، فلا يمكن أن يكون أحدهما وحده هو الإجابة.' WHERE id = '1965822b-fc1a-4ee5-8f7a-645be0d8c100';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#116: % صف', n; END IF;
  -- tue:yalo_tue#103: «أغصان : أوراق» قريبة من العلاقة
  UPDATE questions SET choices = '["سواري : أعلام", "قواعد : أبنية", "قلم : حبر", "بحر : أمواج"]'::jsonb WHERE id = '92dcf407-84d7-44e2-b13e-44db7afc59f4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل tue:yalo_tue#103: % صف', n; END IF;
  -- tue:yalo_tue#134: «كثرة الشعراء» يدعمها النص
  UPDATE questions SET choices = '["قلة الشعراء", "قلة إقبال الناس على الشعر", "تباين الشعراء في العصر الجاهلي", "تشابه الشعراء في العصر الجاهلي"]'::jsonb WHERE id = 'a2784d77-1128-49aa-80da-40987da39ec0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل tue:yalo_tue#134: % صف', n; END IF;
  -- tue:yalo_tue#133: توضيح استبعاد السن
  UPDATE questions SET explanation = 'سُمّي نابغة لأنه أبدع في الشعر دفعة واحدة، فمقياس النبوغ في النص هو الموهبة والإبداع لا السن أو الجاه. أما عبارة «بعدما أصبح رجلًا» فتحدد وقت نبوغه لا مقياسه.' WHERE id = '7ddd79e0-22c3-4324-bee0-8e86ef068b5d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل tue:yalo_tue#133: % صف', n; END IF;
  -- wed:yalo_wed#108: «تأجيل – الإسراع» تبدو نصيحة صحيحة
  UPDATE questions SET choices = '["إنجاز – المماطلة", "تأخير – تفريط", "إهمال – الإتقان", "ترك – البدء"]'::jsonb, explanation = 'المقابلة المستقيمة: إنجاز العمل خير من المماطلة فيه. والتأخير والتفريط كلاهما مذموم فلا يفضل أحدهما الآخر.' WHERE id = 'ff3bce7a-a847-41a8-b083-ad6093a41452';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#108: % صف', n; END IF;
  -- wed:yalo_wed#120: «همتنا» خطأ ثانٍ في الجملة (الصواب همتكم)
  UPDATE questions SET question_text = 'يا أيها الشباب، لكم مسؤولية كبيرة، ونحن نضع فيكم شكًّا كبيرًا في أن تعلو همتكم علمًا.', choices = '["مسؤولية", "شكًّا", "الشباب", "علمًا"]'::jsonb WHERE id = '1129e5ed-80f4-4ba0-ad54-5022ae5bc16c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#120: % صف', n; END IF;
  -- wed:yalo_wed#125: الفرس يقال للذكر والأنثى فالشرح السابق غير دقيق
  UPDATE questions SET explanation = 'الفرس والناقة والأتان دوابّ أليفة تُركب، أما الزرافة فحيوان بري لا يُركب.' WHERE id = 'd3a038b6-9bde-4fb5-acd3-4fbe306267e0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل wed:yalo_wed#125: % صف', n; END IF;
  -- thu:yalo_thu#111: «صحة – بتر» كانت تصح بقراءة الموقف موقف المتكلم
  UPDATE questions SET question_text = 'محاولة تخطئة الطرف الآخر في كل ما يقول والبرهنة على ....... موقفه بالكامل ....... للتواصل.' WHERE id = '69e067f0-a25a-4bbe-a6e4-42a30055afba';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#111: % صف', n; END IF;
  -- thu:yalo_thu#125: «المؤسسة» تقارب «المنظومة» في النص
  UPDATE questions SET choices = '["المنافسة", "القوة", "التشخيص", "الشراكة"]'::jsonb WHERE id = 'ccec080c-1944-4496-8d63-e5cb2df07a60';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#125: % صف', n; END IF;
  -- thu:yalo_thu#130: الشرح لم يحسم بين ١٧٫٥ و١٨٫٥
  UPDATE questions SET explanation = 'الانفجار يبعد ٩ بلايين سنة ضوئية وهي تقريبًا نصف أقصى مسافة رُصدت، ولأنها «تزيد عن نصف» أقصى المدى فهذا المدى أقل من ١٨ بليونًا: ١٧٫٥ (نصفها ٨٫٧٥ أقل من ٩).' WHERE id = '5955518c-2bcc-47ec-884d-3760211be8aa';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#130: % صف', n; END IF;
  -- thu:yalo_thu#131: خيار مكتوب خطأ ويحتاج الشرح توضيحاً
  UPDATE questions SET choices = '["دفقات جاما", "أسطع الانفجارات", "كوكبة الكركي", "المراصد الفلكية"]'::jsonb, explanation = 'محور النص انفجار وُصف بأنه من أسطع الانفجارات وأبعدها، فالعنوان الجامع: أسطع الانفجارات. أما أشعة جاما فوردت وصفًا في الفقرة الأخيرة.' WHERE id = '9a6b1875-0ba7-4cc9-b163-23d078563132';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#131: % صف', n; END IF;
  -- thu:yalo_thu#126: «معرفة ما يفكرون به» المعنى الحرفي فكانت تنافس المفتاح
  UPDATE questions SET choices = '["مرافقة البسطاء", "التحدث مع الناس", "قراءة ما يكتبه الآخرون", "التنزه مع الناس في الحدائق"]'::jsonb WHERE id = 'a3129d14-e491-4139-97aa-220434b1ee49';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل thu:yalo_thu#126: % صف', n; END IF;
  -- sun:yalo_sun#103: «أعسب» خطأ نسخ
  UPDATE questions SET choices = '["عريان : ثوب", "أشعث : شعر", "حافي : قدم", "معمّم : رأس"]'::jsonb WHERE id = 'f6343c60-646d-470d-9b2e-28ea3d378c9a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#103: % صف', n; END IF;
  -- mon:yalo_mon#103: «مرأة» خطأ نسخ
  UPDATE questions SET choices = '["شمس : نهار", "فل : ياسمين", "كآبة : مرآة", "رجل : كهل"]'::jsonb WHERE id = 'a05283e9-5a34-4e90-9348-fdf3176fa3bb';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل mon:yalo_mon#103: % صف', n; END IF;
  -- sun:hemma_sun_v#319: «سم فاتك» صحيحة لغوياً فلا خطأ سياقي فعلي
  DELETE FROM questions WHERE id = '6a5c6a08-027f-4d8b-a25c-1c22fd00e95d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'حذف sun:hemma_sun_v#319: % صف', n; END IF;
  -- sun:yalo_sun#133: القطعة المختصرة لا تسند المفتاح، والخيار المُكمَّل هو المسنود — يُعاد ترقيم yalo_sun#134 إلى ١
  DELETE FROM questions WHERE id = 'a849a6b2-d368-4fff-a138-00366cf071de';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'حذف sun:yalo_sun#133: % صف', n; END IF;
  -- thu:yalo_thu#133: العبارة المقتبسة غير موجودة في القطعة وخيار آخر يناقضها أكثر
  DELETE FROM questions WHERE id = '7b1449b6-4a53-4cd8-9413-64e56ca860ae';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'حذف thu:yalo_thu#133: % صف', n; END IF;
  -- wed:yalo_wed#129 (القطعة كاملة): كلمة «موضوعية» التي يسأل عنها السؤال لم تكن في القطعة
  UPDATE questions SET passage_text = 'العالم دائمًا لا يعمل إلا بالحقائق ويكون موضوعيًا محايدًا دائمًا، حتى لو كانت المسألة ضد عالم كبير وثقة؛ فهو يُحكّم عقله قبل عاطفته. ويجب على العلماء أن يكونوا حياديين في التقييم والرأي.' WHERE passage_id = 'e1a90903-2026-4c00-9d00-000000000003';
  GET DIAGNOSTICS n = ROW_COUNT; IF n < 1 THEN RAISE EXCEPTION 'قطعة wed:yalo_wed#129: % صف', n; END IF;
  -- sun:yalo_sun#134: إعادة ترقيم بعد حذف yalo_sun#133
  UPDATE questions SET passage_order = 1 WHERE id = 'f4c950e8-8b4e-4cca-bcb7-5c12d5917210';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'تعديل sun:yalo_sun#134: % صف', n; END IF;
END
$rv$;

UPDATE leak_groups g SET question_count = (SELECT COUNT(*) FROM questions q WHERE q.leak_group_id = g.id)
WHERE g.id IN ('ad060926-2026-4c00-9d00-060920260001','ad070926-2026-4c00-9d00-070920260001','ad080926-2026-4c00-9d00-080920260001','ad090926-2026-4c00-9d00-090920260001','ad100926-2026-4c00-9d00-100920260001');

DO $chk$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id = 'ad060926-2026-4c00-9d00-060920260001'; IF n <> 116 THEN RAISE EXCEPTION 'sun: % بدل 116', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id = 'ad070926-2026-4c00-9d00-070920260001'; IF n <> 68 THEN RAISE EXCEPTION 'mon: % بدل 68', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id = 'ad080926-2026-4c00-9d00-080920260001'; IF n <> 57 THEN RAISE EXCEPTION 'tue: % بدل 57', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id = 'ad090926-2026-4c00-9d00-090920260001'; IF n <> 50 THEN RAISE EXCEPTION 'wed: % بدل 50', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id = 'ad100926-2026-4c00-9d00-100920260001'; IF n <> 63 THEN RAISE EXCEPTION 'thu: % بدل 63', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE leak_group_id::text LIKE 'ad__0926%' AND passage_id IS NOT NULL AND passage_order > (SELECT COUNT(*) FROM questions x WHERE x.passage_id = questions.passage_id);
  IF n <> 0 THEN RAISE EXCEPTION 'ترقيم قطع مكسور: %', n; END IF;
  RAISE NOTICE 'الأحد 116 · الاثنين 68 · الثلاثاء 57 · الأربعاء 50 · الخميس 63 = 354 — سليم';
END
$chk$;

COMMIT;