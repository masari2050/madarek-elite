-- ═══════════════════════════════════════════════════════════════
-- تنظيف استيراد اللفظي 2026-02-15 + لام ألف المقلوبة في استيرادي اللفظي 2026-02-15 والتحصيلي 2026-04-03
-- بموافقة عبدالله 2026-10-01 على القائمة المعروضة عليه (صفحة المراجعة)
-- 1) لام ألف: 168 صفاً (عالقة←علاقة، خاليا←خلايا، ال←لا المنفردة، االتزان←الاتزان…) — قرارات مراجعة يدوية كلمة كلمة
-- 2) إعادة كتابة سؤالين قابلين للاسترجاع من بياناتهما (3ec647f8 لفظي، fe5ddb16 أحياء)
-- 3) الأسئلة الثمانية ذات المفتاح الخاطئ: تصحيح المفتاح والشرح
-- 4) تعطيل (disabled=true، بلا حذف): 69 سؤالاً لفظياً مكسوراً غير قابل للاسترجاع
-- كل تعديل مقيّد بالـid وببصمة md5 للمحتوى الحالي، ومتحقق أنه لمس صفاً واحداً — أي اختلاف يُرجع المعاملة كلها
-- نسخة احتياطية كاملة: backup_2026_10_01.questions_before_import_cleanup
-- الرجوع: UPDATE questions q SET question_text=b.question_text, choices=b.choices, correct_index=b.correct_index,
--   correct_choice=b.correct_choice, explanation=b.explanation, disabled=b.disabled
--   FROM backup_2026_10_01.questions_before_import_cleanup b WHERE b.id=q.id;
-- ═══════════════════════════════════════════════════════════════
BEGIN;

CREATE SCHEMA IF NOT EXISTS backup_2026_10_01;
CREATE TABLE IF NOT EXISTS backup_2026_10_01.questions_before_import_cleanup AS SELECT *, now() AS backed_up_at FROM questions WHERE id IN ('0021408e-6030-49b5-8b27-078481bfdc60','00cbb85c-895f-44c8-a216-c42f4a9b48e4','015b201e-990a-4e75-895a-8aa522c5f3b8','01be061d-35cf-4f45-920c-8c69c83cdb5b','01e26259-7045-416c-8653-ca12f0f6ac34','0334f367-f161-413e-94c6-e607549c185f','049abeb3-49fd-45dc-a7ab-16d02abe05ed','0505f72a-5078-4e01-b1c2-ddbe85493d74','06e8405b-7bd5-4bc4-a840-1c6d7f696484','080ad237-2559-4e0d-887f-7cc03fbb7b90','098fc826-8d1c-4576-87cf-26b7a27ecbc4','0c2fbdd0-19c2-43f5-a520-10918c9855e8','0c36b29e-b69d-499c-96ce-94f03234e07d','0ccae33b-bb05-43c8-82f6-363df233693a','0f2baee5-7466-4a7f-b307-8561b4791c45','0facece7-3ff0-43da-ac76-a21d652ca3bb','107093da-4f1c-4cb0-a078-4756cb26ef13','1a96f4c9-7d00-4448-bd82-74b8bb0cb9d9','1bb5a375-4b80-447a-a4bb-228ace233540','1c47ea34-7035-40c1-bb7e-f40222a01a73','1eb87381-a410-42d0-b71d-721014844930','1f3800a2-0879-40f6-955f-8d5f0b563839','2157b91b-8601-4c69-b49b-1f7cd8265960','216c52ea-a87f-463b-8c43-35614c4ee62c','22d9549c-08c6-4f34-8947-d6be9868482e','22ea251c-e39a-41f3-98f8-f4ba54404466','23aa8011-da43-4466-8c3c-026935b94b59','246d0efd-991c-447a-bb43-f9883b8cf5e4','2974109f-76d5-4b4d-b828-72b63b793f9e','29cbded9-3c5a-4d96-99f1-d45f10795a01','2abedfca-0dbf-42f1-ad70-fe3eebf6076f','2b6d5235-e736-4c3e-b0e6-e248976a9d04','2c2818d3-1957-4acc-9124-aa426412d898','2cd9bb85-50c6-439b-8ea8-088e08ae2c65','2d1b31cd-32f6-4f79-98bf-f49bfc45e539','2dc736d0-bbac-46d4-b654-d87fb4ed6cd6','2e2d9196-a7e8-4a5e-bdf8-656a40d11e8a','2e4947d9-ce23-4628-8147-6b31cd6a5614','2f218d6b-23b8-4102-81af-4465faddf1cf','32d24195-763b-4be4-bb23-e1fbf755a823','32e03861-c227-490d-b4a5-1629585f7d65','32fb4c75-1864-479b-a6f5-86c793973cb9','337873db-ee9c-42c4-887a-24b825704858','344e9ed3-96aa-4ccb-9f88-9a72a67134b6','34807e8d-c677-4e88-a11e-f8d86a3d9c9f','348bca44-786c-47c3-beef-d6b6c6a56a4b','353e68f2-c2d6-4c15-8f4d-b0d7d6853a18','39a110f5-4012-41e7-90aa-486677c147ce','39bdecf8-c459-4ac1-9309-c0b5e86a459d','3ae5b04b-44dc-45a9-b66a-7af59cf7c8fb','3b8be313-327a-46b6-a33c-fa146b53391c','3bdc8c37-4e6c-403c-b595-336b20115112','3c8c1813-2c71-42f1-ad8c-839f022606a6','3d1cfa61-0a2b-456f-b83d-fc5a544258c5','3e3485f6-81be-4713-8d57-da2584ebf555','3ec647f8-40ea-4610-8470-7ae470fa7cdb','41190343-4a02-41b1-b7be-e4c164d1809e','432167cd-6a4d-4409-bebb-0752994aec69','46d97811-e2d9-4ca8-bde6-990eefa91d92','470398b1-3c5a-4f84-afdb-52d4ccae9f14','48197c71-0535-4a4d-8b9a-8f5eef69a3c2','499e1204-a6c1-4fdb-b93b-88b7bbd8279e','4c68f043-bb52-4120-907e-61d7aad363b2','4e1915de-fde9-45a3-a77a-b9b91b051ae1','4ef79fb6-8de2-48d9-b7ad-d08a004d80ff','50392a58-8d7c-4500-97a2-6a0a119b7859','506ccc8d-da5d-4f4b-9d24-4993e592a9e4','50d9e41b-eebe-4ef2-bdc9-b937237c04a2','512742bf-f362-4d43-8fa9-158325afe1d3','516eac91-f234-40d5-ae2d-198b801aa8ad','51b93c08-778c-4056-9da6-fcbc5ad43df4','5261a33f-f5e5-4bbd-b1b9-853259e8caa8','52855cc8-c461-42f4-9b46-26e3161d7dfd','52afe93d-6749-4b35-825c-540ceab2ada4','530b6424-3143-4be5-b086-9580ac44bd00','53d1dd55-743a-4c37-90d9-b8c3ba90742a','53eb972f-cd42-4b48-9073-342e7fe3f1b3','5425952a-96d7-4f8b-bf59-923a3f5dd50f','55960854-8c7c-4a60-9963-b5fb2b95e0f3','5937bb9f-203e-466a-86bd-7d0272a86e0a','5ffb4e1c-c9eb-44dc-8426-3fc1becb8631','612fd19d-2da4-4c2b-b278-2340051d9ac4','61e119b6-bc60-401f-9664-06aed6d34958','6548fed8-689a-45ea-9262-017b050f31a5','66323f7b-5297-4e93-b7a0-feb84b2d0336','66479eda-5c8c-4696-a999-aafc2b9e3b67','69384030-3026-439e-9a45-89ef60305c73','6b84970f-7ea1-4ce7-9031-bb237c077e21','6eae3cfc-933c-4d28-bc35-8507ccd51359','6ef05a06-76ea-4de3-90c6-4495ba28a782','735e9170-bfff-41ae-906d-fe62e96319fc','73765fd8-caca-48d2-bdf7-7d6ece6a1932','74a30465-24ae-486b-af28-1c18906e4d48','78db1e0a-2eee-4e9d-a03d-d00939024710','78de34b0-fb5e-4e44-b2bb-2ec8e225b45a','7a3008d7-14d0-4c7d-8ce0-1fb7f8ae303e','7a95daeb-c8a7-4ba1-a7df-63cac82bc51d','7afc4e85-16bb-4dc9-bcea-3f1046056c30','7c27509d-4cb7-49cd-b165-49cfdbd29c74','7c8afb28-b6e1-4026-919e-d30a4bc84988','7d32477b-58ca-4fc8-aab0-c5dfa88b626e','7dbfa44f-baf2-4df6-a6f5-1160a392365d','7e1ebf0c-1e36-4fb9-8dae-21730d99efd7','7e512b89-1184-4aaf-a438-81207e8a6960','7e79ea45-f024-4cc1-9e72-561b0a99e8b8','812458c5-028e-4b15-8458-b90e0f5401c9','81a81efb-c94a-4abf-94b3-7948bd128a85','82de8cfb-8879-4496-bb75-973078f6190a','8358ddd0-caa7-41dd-b30b-806b4ed984d8','850d9f14-fa3d-4c29-bd73-d75b8b91d14c','85a6f378-c6e3-4b88-8399-50026ba62741','85aae531-c13d-46bf-bee3-42f221545e42','863ba1b9-498c-4be8-a8d9-7923eddf0394','86565018-5766-4b5c-b06f-6c7f1e268627','87bdafad-9651-4790-9b4f-eb21f4fa0f04','87e91d4f-7115-4d72-bfa9-2aa86715ea4c','8898475f-8fdf-4ece-882f-a87a5becb0b0','8c2f9926-2cd2-455c-b79d-ad9150fedf32','8d72d16a-787d-4e51-9d18-baee326a0023','8e11de08-bd0f-46d3-af0d-f1fa0b45312f','8fd369b9-4d6b-4626-a043-0bc6de1c7e3a','91e74ba3-d598-4a42-a2cf-d56ebfb452dc','9288cfc1-2224-494d-9b4f-c82b0af468a9','9315ef6e-3f28-4cc9-b40b-898facb4be4c','93b76a48-232a-437e-b919-075e0306f355','9573fc99-8473-4f60-8733-5e2fefbcda08','97075611-b1d3-41c7-98fe-96b391f808bb','9dbb0180-8c57-45d5-af75-4210f4c6095a','9df11f57-373d-4d41-8ed9-30ae19fbbae4','9e2036d9-06e2-4730-923d-a1b7840b76dc','9ec8c877-ec52-48cd-ae68-950b74958374','9eef52c7-0ed8-4eeb-9827-83766c5c791b','a029dc46-6695-4959-8582-3cf719006d34','a0f9cb09-64fd-4c36-af08-979670fb764e','a32af796-1864-451b-bd85-65dfe907a7d1','a462e755-525f-4446-8e43-ab8b9d800204','a492132e-1842-4e29-a99b-bfa6ab96591d','a4f6a1f8-046f-49dc-8e9f-c5bf6859a9bf','a6605217-3e33-43c3-9257-f8d7f2c46609','a6648f2c-7cfa-4810-bd6b-3db7537af8ee','a67c5e1b-0352-4952-96bc-ef05090151f5','a78f5f6b-56f4-4807-8195-4f6a2f276fc4','aad8a7dd-d3e3-4bfe-8bee-24fb75b46ea1','ac420461-0249-461f-a636-7303b2b78773','ae99e0c3-e8d8-4ce4-a4ba-e425f66f8bfe','b237c9f9-6e95-428b-ae28-6bb167c27f08','b3e0f697-d7f7-4d2f-8eb8-b357d2a71a16','b46c1e21-0609-4547-b8a7-1a37b0c87bee','b55e2fac-813d-418c-81a8-f2ac71ba1a3d','b68929db-6ea6-49b7-8b29-8cfb241bc0ae','b694e73f-b51d-410c-915e-dc0a16cf4b20','b765fcc3-bd1f-43f9-842a-fa37548c3e1a','b8953a35-00f6-4382-883a-0e5cabe2ff4c','b9fadb4b-de0f-4278-ac7c-ca40179b7d03','ba1f3165-48eb-4062-b10d-e33d50d828e1','ba62c610-c3f1-47c7-8782-2f3214b585bf','bcde79d5-8480-45c9-8aa0-e6bd62fc30d2','bddb5d99-af5b-472c-b565-c6324d470d7c','be73373b-2d6b-47fe-b451-eb7ec1bfd417','be96ced8-0a25-4ffa-9edb-1ed1a1013b69','c4eb9c2b-3097-4b91-b9e2-cd1bfc2cd5a2','c51b4bc3-09f2-421a-b54e-1e694135d9e9','c54e1152-df48-4f4b-81b0-0ed3eba8bff1','c8148846-5bd4-45e3-9585-69679e545524','c8498021-b9e5-4ea5-ab44-5c41cf369da2','cbdc9382-e3ea-4bc6-bd4f-149b8bb9c076','cc36c8c3-bac8-4639-bc61-d660343a1caf','cc8e4d6b-08cf-4ecf-9ad3-40495dd99d48','ce2f38a3-56c0-40f6-9f5e-e06f6cdef18c','ceba5603-4378-4872-9393-50752e0f928b','d0d31f4b-bf65-46f2-9df3-adf844df7424','d3640288-2f94-4c25-808b-b0ed4101c664','d392dc45-5693-4afc-99de-b1b31f65c4f4','d464f989-d67d-417d-8b66-af158ab9d2b4','d62f0ab8-f20d-4931-b729-23e651cfbc66','d6b460be-3896-400b-8660-8f0a6b06563c','d7851be2-d732-435a-9528-db4899eb096e','d8c70202-944c-40f3-a221-26bbd4eeeb1c','da175160-9402-40b3-b00d-c4ba028802cc','da2725de-e4d6-46d8-9937-7f8525e6cfee','db0423b2-4e62-4f5c-abd1-a375a6cf5a8e','dba9cc50-2597-474c-b0ed-2da323644584','dde4ed2f-7f1f-47a4-92da-01cbfcbdd8b5','dec55595-79e1-45d0-bde1-e7f417075546','e1eddfc2-78bc-41ac-9482-d23277997e9a','e3748d23-3995-4ee8-8e9e-921d37ce6f9f','e4cee5a0-219f-4bcc-b29f-7fd5d9c44bf8','e5cc2bdb-decc-44a6-b4cf-41b341a4b8d3','e7d216f5-10fb-45c5-9406-ceb480464eb5','e8d6dff2-f371-4e8d-b0d7-fec5395b7755','ec8f180a-e1c3-4883-a40c-e5c03392cf6c','ecc3ea0c-7ee6-49f3-9acb-6b3776a1145b','ed3562a4-57b9-43db-a7ba-6a365bc57b56','ee0270a7-c7c5-43ad-9ff3-022d17b1302f','ee0f2881-4be2-4873-8d82-660163d591ad','ef726b1e-5245-4634-af36-a2377ae093fa','eff750f6-4520-4996-9a97-e84b379b85fa','f158f12a-a701-4bab-8185-0885693ccc7a','f1707701-9a40-43d6-969c-150692b3dc6a','f1bf0f0b-c9d6-457f-b875-e8ddb29f4900','f3bf973f-6710-4069-a614-c0eebd81ab8a','f482ead5-7e31-4d90-b49d-309b30fcc475','f4bc1fcc-157a-4693-856b-ed3bfc9a89d6','f8d07fd2-e332-4fb8-bf94-eae16f948742','f910ee70-0c9c-4e9d-9602-af7a1362581b','fac2daa9-594b-4e81-a509-d68b2ca93618','fb07d076-447e-47fd-b315-b3e1623ca189','fc55f4d3-272c-4412-964c-5a0e8d91538c','fe01ca07-7425-4fff-9634-6f06554051cf','fe31681f-db51-497a-b5ac-035a5895d8ec','fe5ddb16-2d48-44ab-a7c9-f64581255194','fee8031d-c467-4ff1-98f5-6ca907e2fcd9','ff49d806-f15a-465c-8b98-21ac7f8c3140');

DO $cl$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM backup_2026_10_01.questions_before_import_cleanup; IF n <> 213 THEN RAISE EXCEPTION 'النسخة الاحتياطية: % بدل 213', n; END IF;
  -- 0021408e [lam]
  UPDATE questions SET choices = '["عمل : قوة", "عصر : ظهر", "حلقة : سلاسل", "زهور : حديقة"]'::jsonb, correct_choice = 'حلقة : سلاسل' WHERE id = '0021408e-6030-49b5-8b27-078481bfdc60' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '951fc3adbddaa9e53046ba18b6898987';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0021408e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 00cbb85c [lam, disable]
  UPDATE questions SET question_text = 'النجاح الحقيقي لا  .......إلا بالعمل .......    576                                              كلما زاد  ..........قل حياؤه', disabled = true WHERE id = '00cbb85c-895f-44c8-a216-c42f4a9b48e4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '00df898f81abbea07ff4a85ca70a931d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 00cbb85c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 015b201e [lam]
  UPDATE questions SET choices = '["سخط : رضا", "غلام : شاب", "حسن : قبيح", "نور : ظلام"]'::jsonb WHERE id = '015b201e-990a-4e75-895a-8aa522c5f3b8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'adad1a7e0996154dbc1ce072f7833c64';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 015b201e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 01be061d [lam]
  UPDATE questions SET question_text = 'في أنثى الإنسان، يكتمل نمو المشيمة خلال الحمل في الأسبوع' WHERE id = '01be061d-35cf-4f45-920c-8c69c83cdb5b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '41961844146f8b3e1d8fd87858d85720';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 01be061d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 01e26259 [disable]
  UPDATE questions SET disabled = true WHERE id = '01e26259-7045-416c-8653-ca12f0f6ac34' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'bd113d0f772755513a737a80e52663da';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 01e26259: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0334f367 [disable]
  UPDATE questions SET disabled = true WHERE id = '0334f367-f161-413e-94c6-e607549c185f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'bfff6d2632ae0ea135ccd34f510d69f2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0334f367: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 049abeb3 [lam]
  UPDATE questions SET choices = '["سيارة : قائد", "تشغيل : انطلاق", "سيارة : طائر", "عمال : مصنع"]'::jsonb WHERE id = '049abeb3-49fd-45dc-a7ab-16d02abe05ed' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '20c73d3d89daf6d64e8a798ca87b29de';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 049abeb3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0505f72a [lam]
  UPDATE questions SET choices = '["ذكي : ساذج", "خطة : حرب", "حمل : ولادة", "دائرة : شمس"]'::jsonb WHERE id = '0505f72a-5078-4e01-b1c2-ddbe85493d74' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '4922da6609db6f246ad4cdc3481db0ae';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0505f72a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 06e8405b [lam]
  UPDATE questions SET choices = '["الكيراتين", "الثيروكسين", "الجلايكوجين", "الأنسولين"]'::jsonb WHERE id = '06e8405b-7bd5-4bc4-a840-1c6d7f696484' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'eec74a5501a707d90fcd5d6f48d90fab';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 06e8405b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 080ad237 [lam, disable]
  UPDATE questions SET question_text = 'إن من  .......الإنشغال بالاخرين ونسال عن  .......حياتهم ،و  .......للأزمان. يكون  ...........في حياتها', disabled = true WHERE id = '080ad237-2559-4e0d-887f-7cc03fbb7b90' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '37ac737734dce3468a75a7c344b8b884';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 080ad237: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 098fc826 [lam, disable]
  UPDATE questions SET choices = '["يبين", "تنويع", "التشابه", "-الافادة"]'::jsonb, disabled = true WHERE id = '098fc826-8d1c-4576-87cf-26b7a27ecbc4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f32de138030783f2ec8bad0dc28d8389';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 098fc826: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0c2fbdd0 [lam]
  UPDATE questions SET question_text = 'عندما تدوس بأحد أصابع قدمك على جسم مدبب فإنك تشعر بألم حاد، هذا الشعور سببه :خلايا عصبية من النوع', explanation = 'الخلايا الحسية هي المسؤولة عن الشعور بالألم' WHERE id = '0c2fbdd0-19c2-43f5-a520-10918c9855e8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b90920e6c2b07a5ba8cf6f8818284ed2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0c2fbdd0: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0c36b29e [lam, disable]
  UPDATE questions SET question_text = 'للأفراد  ،وإنما يتعداه إلي  .......لتدعيم المشروعات التنموية', explanation = 'الإجابة: <b>تنعكس</b>. بالنظر لسياق الجملة التي تتحدث عن للأفراد، نجد أن هذه الكلمة هي الأنسب لإكمال المعنى المقصود، بينما الخيارات الأخرى لا تتوافق مع السياق.', disabled = true WHERE id = '0c36b29e-b69d-499c-96ce-94f03234e07d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5227eab68644c3b2a55de7da69817af4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0c36b29e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0ccae33b [lam]
  UPDATE questions SET choices = '["السوائل", "الغازات", "البلازما", "الغازات والسوائل"]'::jsonb WHERE id = '0ccae33b-bb05-43c8-82f6-363df233693a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5c82bcd52be3f0e73320165c7f3afd41';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0ccae33b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0f2baee5 [lam]
  UPDATE questions SET question_text = 'احتكار : غلاء' WHERE id = '0f2baee5-7466-4a7f-b307-8561b4791c45' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'db3cf2d40514fcc3be7fbd7681f836c4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0f2baee5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 0facece7 [lam]
  UPDATE questions SET choices = '["طائرة : مواصلات", "فواكه : تفاح", "حظيرة : حيوانات", "نمر : إفتراس"]'::jsonb WHERE id = '0facece7-3ff0-43da-ac76-a21d652ca3bb' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6939f718618dc2e53605d46a97ffb4b2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 0facece7: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 107093da [lam]
  UPDATE questions SET choices = '["كاتب : إبداع", "شجرة : ثمرة", "طبيب : علاج", "جراحة : طبيب"]'::jsonb WHERE id = '107093da-4f1c-4cb0-a078-4756cb26ef13' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '932cb7800686915aefbfe15a10ab31b2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 107093da: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 1a96f4c9 [disable]
  UPDATE questions SET disabled = true WHERE id = '1a96f4c9-7d00-4448-bd82-74b8bb0cb9d9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '4fbc20f9e6c2c6a5ae3b3bff0c8bb34a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 1a96f4c9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 1bb5a375 [disable]
  UPDATE questions SET disabled = true WHERE id = '1bb5a375-4b80-447a-a4bb-228ace233540' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b9300424eeb488e56ff7de2b02dd9ff1';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 1bb5a375: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 1c47ea34 [keyfix]
  UPDATE questions SET question_text = 'التغافل عن الأخطاء غير المؤثرة من شيم الجاهلين.', correct_index = 3, correct_choice = 'الجاهلين', explanation = 'الخطأ السياقي: <b>الجاهلين</b>، والصواب «العقلاء» أو «الكرام».<br>التغافل عن الأخطاء التي لا تضر خلقٌ رفيع يدل على الحلم وسعة الصدر، فلا يوصف به الجاهلون.' WHERE id = '1c47ea34-7035-40c1-bb7e-f40222a01a73' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f6536759ae012c299ee851a8e473d89c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 1c47ea34: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 1eb87381 [lam]
  UPDATE questions SET question_text = 'زهو : خيلاء' WHERE id = '1eb87381-a410-42d0-b71d-721014844930' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c2d8c8a287f1e0e66a63c9da76db6029';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 1eb87381: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 1f3800a2 [lam]
  UPDATE questions SET question_text = 'إقلاع : تحليق' WHERE id = '1f3800a2-0879-40f6-955f-8d5f0b563839' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'bbd936212464ac0d429dfd8db885dd1e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 1f3800a2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2157b91b [lam, disable]
  UPDATE questions SET question_text = 'إن للتعلم مرارة لن يذوقها إلا من ذاق مرارته مرتاحة', disabled = true WHERE id = '2157b91b-8601-4c69-b49b-1f7cd8265960' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '55983b0f53bf991e6633fb7d2a951810';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2157b91b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 216c52ea [keyfix]
  UPDATE questions SET question_text = 'الغبي هو من يتكلم ببطء، ويفهم بسرعة.', correct_index = 0, correct_choice = 'الغبي', explanation = 'الخطأ السياقي: <b>الغبي</b>، والصواب «الذكي» أو «الحكيم».<br>من يتأنى في كلامه ويسرع في الفهم يوصف بالذكاء لا بالغباء، فالكلمة تناقض بقية الجملة.' WHERE id = '216c52ea-a87f-463b-8c43-35614c4ee62c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3da120edd175fdbc1899848e7238dc2c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 216c52ea: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 22d9549c [lam]
  UPDATE questions SET choices = '["مستشفى : علاج", "صالة : طعام", "مسجد : طمأنينة", "حديقة : حيوانات"]'::jsonb, correct_choice = 'مستشفى : علاج' WHERE id = '22d9549c-08c6-4f34-8947-d6be9868482e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c288ce98b65558c031f0783ebcd0550d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 22d9549c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 22ea251c [lam]
  UPDATE questions SET question_text = 'مركب كيميائي يخزن في الخلايا وتطلقه كمصدر للطاقة', explanation = 'ATP هو الجزيء الذي تخزنه الخلايا كمصدر للطاقة' WHERE id = '22ea251c-e39a-41f3-98f8-f4ba54404466' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c82f0f91175f6eba5bb54dc058435b22';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 22ea251c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 23aa8011 [lam]
  UPDATE questions SET explanation = 'تقل طاقة التأين في المجموعة الواحدة كلما اتجهنا للأسفل' WHERE id = '23aa8011-da43-4466-8c3c-026935b94b59' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '803fdabbed50579e1cbbce6d52cc18ac';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 23aa8011: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 246d0efd [keyfix]
  UPDATE questions SET question_text = 'لحظة ............. تساوي أحيانا حياة من الخبرة.', correct_index = 2, correct_choice = 'تعقل', explanation = 'الإجابة: <b>تعقل</b>.<br>لحظة تفكير وتبصر قد تمنح الإنسان ما تمنحه سنوات من الخبرة، أما العجلة والتسرع فيضيّعان الخبرة ولا يصنعانها، و«التفنن» لا صلة له بالمعنى.' WHERE id = '246d0efd-991c-447a-bb43-f9883b8cf5e4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '445e48de481c028d92a7845efc4392fe';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 246d0efd: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2974109f [lam]
  UPDATE questions SET question_text = 'التغير في المحتوى الحراري الذي يرافق تكون مول واحد من المركب في الظروف القياسية :من عناصره في حالاتها القياسية يسمى', choices = '["حرارة الاحتراق", "قانون هس", "حرارة الانصهار المولارية", "حرارة التكوين القياسية"]'::jsonb WHERE id = '2974109f-76d5-4b4d-b828-72b63b793f9e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '75d5e18dd00ea85d66b72ba2b62e8435';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2974109f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 29cbded9 [lam]
  UPDATE questions SET choices = '["أكل : شبع", "سيارة : مقود", "فعل : قول", "هذا : هؤلاء"]'::jsonb WHERE id = '29cbded9-3c5a-4d96-99f1-d45f10795a01' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'dc1237c89d1739fea36d8552a52b9e26';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 29cbded9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2abedfca [lam]
  UPDATE questions SET question_text = 'زهو : خيلاء' WHERE id = '2abedfca-0dbf-42f1-ad70-fe3eebf6076f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '54d146a639b3cf94aa332ac9dc3b74ab';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2abedfca: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2b6d5235 [lam]
  UPDATE questions SET choices = '["المفترسات", "الذاتية", "القارتة", "المحللات"]'::jsonb WHERE id = '2b6d5235-e736-4c3e-b0e6-e248976a9d04' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '572589da1c8768700bdf813dabedf181';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2b6d5235: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2c2818d3 [lam]
  UPDATE questions SET question_text = 'عند تتبع حركة :جماعة من النمل لاحظت أنها تسير في طرق محددة يتبع بعضها بعضً ا وذلك' WHERE id = '2c2818d3-1957-4acc-9124-aa426412d898' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '34f1d84920a0e60e530c7b36d92558ba';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2c2818d3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2cd9bb85 [disable]
  UPDATE questions SET disabled = true WHERE id = '2cd9bb85-50c6-439b-8ea8-088e08ae2c65' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6c608500da0df8dd55063179aef16bf2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2cd9bb85: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2d1b31cd [lam]
  UPDATE questions SET choices = '["بظهور خيوط المغزل", "باختفاء الغشاء البلازمي", "بتضاعف وانفصالDNA", "بغياب المريكزات"]'::jsonb, explanation = 'المريكزات عبارة عن نوع خاص من الأنيبيبات الدقيقة التي تساعد الخلية في الإنقسام وتوجد في الخلايا الحيوانية وبعض أنواع الطلائعيات' WHERE id = '2d1b31cd-32f6-4f79-98bf-f49bfc45e539' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '89c33b2444e2bae168e61ab7e7dcad8e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2d1b31cd: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2dc736d0 [lam, disable]
  UPDATE questions SET question_text = 'لا تجادل  ........فقد يخطئ الناس في  ............بينكما      547                الرعي  ................من  ................الأمور على البيئة', disabled = true WHERE id = '2dc736d0-bbac-46d4-b654-d87fb4ed6cd6' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '74029050da86277f105ddbcc1cf64255';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2dc736d0: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2e2d9196 [disable]
  UPDATE questions SET disabled = true WHERE id = '2e2d9196-a7e8-4a5e-bdf8-656a40d11e8a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'a56d614ee6f21b4fa6547b1687c0f385';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2e2d9196: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2e4947d9 [lam, keyfix]
  UPDATE questions SET question_text = 'الطريقة الوحيدة لإعاقة النجاح هي أن تحب ما تفعل.', choices = '["الوحيدة", "لإعاقة", "تحب", "تفعل"]'::jsonb, correct_index = 1, correct_choice = 'لإعاقة', explanation = 'الخطأ السياقي: <b>لإعاقة</b>، والصواب «لتحقيق».<br>حب الإنسان لعمله طريق إلى النجاح لا إلى إعاقته، فالكلمة تقلب معنى الجملة.' WHERE id = '2e4947d9-ce23-4628-8147-6b31cd6a5614' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd5d137c7f7cc081a97a3f7510c86863a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2e4947d9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 2f218d6b [lam]
  UPDATE questions SET choices = '["خلف مركز التكور", "في اللانهاية", "بين البؤرة ومركز التكور", "خلف المرآة"]'::jsonb, explanation = '𝒇= 𝟎.𝟓𝒓 𝒇= 𝟎. 𝟓× 𝟐𝟒= 𝟏𝟐 عندما يقع الجسم في بؤرة المرآة المقعرة فأن صورته تتكون في المالانهاية ولا يمكن رؤيتها' WHERE id = '2f218d6b-23b8-4102-81af-4465faddf1cf' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '042f570e15cccf830642641b466d2da4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 2f218d6b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 32d24195 [lam]
  UPDATE questions SET question_text = 'أي الآتي يحتوي على رابطة تساهمية ثلاثية؟', explanation = 'الصيغة العامة للألكاينات𝑪𝒏 𝑯𝟐𝒏−𝟐' WHERE id = '32d24195-763b-4be4-bb23-e1fbf755a823' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '29553d1a342a8c7ce5e0a320f348d212';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 32d24195: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 32e03861 [lam]
  UPDATE questions SET choices = '["أكبر من قوى التلاصق", "أقل من قوى التلاصق", "تساوي قوى التلاصق", "معدومة"]'::jsonb WHERE id = '32e03861-c227-490d-b4a5-1629585f7d65' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'bfcf18cd04efb4420f6b3ababc2e323e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 32e03861: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 32fb4c75 [lam]
  UPDATE questions SET choices = '["نوع الغاز", "عدد المولات", "حجم الوعاء", "درجة حرارة خليط الغاز"]'::jsonb WHERE id = '32fb4c75-1864-479b-a6f5-86c793973cb9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '20e5fe8c82442b842b54a7c6bf3ccfde';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 32fb4c75: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 337873db [lam]
  UPDATE questions SET question_text = 'تمثل عدد المولات المذاب الذائبة في لتر من المحلول', choices = '["النسبة المئوية الوزنية للمذاب", "النسبة المؤوية الحجمية للمذاب", "المولارية", "المولاليّة"]'::jsonb WHERE id = '337873db-ee9c-42c4-887a-24b825704858' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '4d4602d4186c328aacd5086e1bac3531';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 337873db: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 344e9ed3 [lam]
  UPDATE questions SET explanation = 'الخيار ب و د تمثل عملية امتصاص ، والخيار أ يكون فرق الطاقة أكبر من الإنتقال في الخيار جـ، وبالتالي التردد أكبر، من العلاقة الطردية بين التردد والطاقة' WHERE id = '344e9ed3-96aa-4ccb-9f88-9a72a67134b6' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '92228fd8734ce37485cf22494a329494';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 344e9ed3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 34807e8d [lam]
  UPDATE questions SET question_text = 'مؤشر : علامة', choices = '["شمس : شروق", "استهلال : ختام", "ملخص : موجز", "طليعة : جيش"]'::jsonb WHERE id = '34807e8d-c677-4e88-a11e-f8d86a3d9c9f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'df5ffb3ced40e1f372f6eb418660f53e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 34807e8d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 348bca44 [disable]
  UPDATE questions SET disabled = true WHERE id = '348bca44-786c-47c3-beef-d6b6c6a56a4b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '25dbf87ccacf7e1b0c264e066bf05532';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 348bca44: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 353e68f2 [lam]
  UPDATE questions SET choices = '["متر : قياس", "شمس : قمر", "كبريت : نور", "قربة : امتلاء"]'::jsonb WHERE id = '353e68f2-c2d6-4c15-8f4d-b0d7d6853a18' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f94ef387562d45dbf090e84c6f225840';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 353e68f2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 39a110f5 [lam]
  UPDATE questions SET explanation = 'الحمض المرافق هو المركب الناتج عن استقبال القاعدة لأيونات الهيدروجين' WHERE id = '39a110f5-4012-41e7-90aa-486677c147ce' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b56b900769cf35c86576b5f82e84c2f9';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 39a110f5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 39bdecf8 [disable]
  UPDATE questions SET disabled = true WHERE id = '39bdecf8-c459-4ac1-9309-c0b5e86a459d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2a60cecd1cec62d4e4f5a8f7271e4649';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 39bdecf8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3ae5b04b [lam, disable]
  UPDATE questions SET question_text = 'لا ينفع .......عند الازمات الاقتصادية  ....... ،وحده هو الحل .   587 (غير مكتمل)', disabled = true WHERE id = '3ae5b04b-44dc-45a9-b66a-7af59cf7c8fb' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'a0a1a9d5f53f67360dd8fe2b80de4b25';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3ae5b04b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3b8be313 [lam]
  UPDATE questions SET choices = '["يتكاثر", "يموت", "لا يحدث انسلاخ", "ينمو"]'::jsonb, explanation = 'يساعد الإنسلاخ في العقرب على نموه بحيث يكون الهيكل الخارجي الجديد المتكون أكبر ويسمح له بالنمو' WHERE id = '3b8be313-327a-46b6-a33c-fa146b53391c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '8c9a780d8a99b7db8d4978831a385405';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3b8be313: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3bdc8c37 [lam]
  UPDATE questions SET question_text = 'تردد العتبة لفلز𝟒. 𝟒× 𝟏𝟎𝟏𝟒𝑯𝒛 فما هي طاقة ارتباط الإلكترون بسطح المعدن إذا كانh هو ثابت بلانك؟' WHERE id = '3bdc8c37-4e6c-403c-b595-336b20115112' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'eaf1180de836e0cedef5fb5f0653b489';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3bdc8c37: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3c8c1813 [lam]
  UPDATE questions SET choices = '["تناقص نمو الأعشاب", "زيادة أعداد الحيوانات المفترسة", "قلة سقوط الأمطار الموسمية", "زيادة الحيوانات آكلات الأعشاب"]'::jsonb, explanation = 'العوامل اللاحيوية هي التي لا تعتمد على المخلوقات الحية مثل الأمطار والرياح وغيرها' WHERE id = '3c8c1813-2c71-42f1-ad8c-839f022606a6' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '047ffe7394e35eb80164681cbba9f565';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3c8c1813: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3d1cfa61 [disable]
  UPDATE questions SET disabled = true WHERE id = '3d1cfa61-0a2b-456f-b83d-fc5a544258c5' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '24083b50299a5c4957a67adda58eaa79';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3d1cfa61: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3e3485f6 [disable]
  UPDATE questions SET disabled = true WHERE id = '3e3485f6-81be-4713-8d57-da2584ebf555' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '494b360d3b308da916169f241d8c21a6';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3e3485f6: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 3ec647f8 [lam, rewrite]
  UPDATE questions SET question_text = 'حب الخير للنفس جهاد لا تقدر عليه كل النفوس.', explanation = 'الخطأ السياقي: <b>للنفس</b>، والصواب «للغير» أو «للآخرين».<br>حب الخير للنفس طبعٌ في كل إنسان ولا يحتاج إلى مجاهدة، أما حب الخير للآخرين فهو الجهاد الذي لا تقدر عليه كل النفوس.' WHERE id = '3ec647f8-40ea-4610-8470-7ae470fa7cdb' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '03da40e3405e660d608c652d8ab9859e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 3ec647f8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 41190343 [lam]
  UPDATE questions SET question_text = 'إذا كانت ثلاث نقاطA, B, C ، وعلمت أن AB+BC=AC :فإن' WHERE id = '41190343-4a02-41b1-b7be-e4c164d1809e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '673d9035e0955ca75790c842e2e7a397';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 41190343: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 432167cd [lam, explanation]
  UPDATE questions SET question_text = 'ظلام : ليل', explanation = 'الظلام صفة ملازمة لليل، كما أن البرد صفة ملازمة للشتاء — علاقة الشيء بصفته الملازمة' WHERE id = '432167cd-6a4d-4409-bebb-0752994aec69' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '53c3c5b40782e2de1bfad9007fa85de3';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 432167cd: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 46d97811 [disable]
  UPDATE questions SET disabled = true WHERE id = '46d97811-e2d9-4ca8-bde6-990eefa91d92' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '836cef8552f363f947f83e5915d77fbf';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 46d97811: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 470398b1 [lam]
  UPDATE questions SET choices = '["للتحلل", "لاكتساب إلكترونات", "لفقد إلكترونات", "للتأكسد"]'::jsonb WHERE id = '470398b1-3c5a-4f84-afdb-52d4ccae9f14' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ab0c9e68a123c0f1a2f33c9118501ff0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 470398b1: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 48197c71 [lam]
  UPDATE questions SET choices = '["صلاة : وضوء", "شراء : دراهم", "نوم : تثاوب", "ضحك : حزن"]'::jsonb WHERE id = '48197c71-0535-4a4d-8b9a-8f5eef69a3c2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3f1bb8ebb9a3f3d937e1f027fef0ca05';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 48197c71: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 499e1204 [lam, disable]
  UPDATE questions SET question_text = 'لا تجعل الماضي  .......فيليهك عن الأمور  .......في الحياة           594                    كلما ارتفع  .......تواضع  ،وكلما ارتفع  .......تكبر .......', disabled = true WHERE id = '499e1204-a6c1-4fdb-b93b-88b7bbd8279e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '0d66013f0f6a7bfdccf3deff3189c310';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 499e1204: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 4c68f043 [disable]
  UPDATE questions SET disabled = true WHERE id = '4c68f043-bb52-4120-907e-61d7aad363b2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5608cf3d0a8ef5bd69dcec0d1ee9080a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 4c68f043: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 4e1915de [lam]
  UPDATE questions SET choices = '["النظرية", "الفرضية", "الاستنتاج", "القانون العلمي"]'::jsonb WHERE id = '4e1915de-fde9-45a3-a77a-b9b91b051ae1' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'cd8ed9a64a54070158b0e5df2f16e38b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 4e1915de: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 4ef79fb6 [lam]
  UPDATE questions SET choices = '["بمتلازمة كلاينفلتر", "بمتلازمة داون", "بمتلازمة تيرنر", "بالجلاكتوسيميا"]'::jsonb WHERE id = '4ef79fb6-8de2-48d9-b7ad-d08a004d80ff' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '838d81f621c874ee615a64b6407f3c35';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 4ef79fb6: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 50392a58 [lam, disable]
  UPDATE questions SET choices = '["-الفرح", "-السكوت", "-الكلام", "-العلم"]'::jsonb, disabled = true WHERE id = '50392a58-8d7c-4500-97a2-6a0a119b7859' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '501ff79c0a423270a8cabc6b11baa729';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 50392a58: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 506ccc8d [disable]
  UPDATE questions SET disabled = true WHERE id = '506ccc8d-da5d-4f4b-9d24-4993e592a9e4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '43ff6bd4e452a5aaa295e4b33a1432cc';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 506ccc8d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 50d9e41b [lam]
  UPDATE questions SET choices = '["إقامة : صلاة", "نبع : ماء", "مرآة : صورة", "مطر : سحاب"]'::jsonb, correct_choice = 'إقامة : صلاة' WHERE id = '50d9e41b-eebe-4ef2-bdc9-b937237c04a2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '71857e21ec944b5adab4b9e019e96a32';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 50d9e41b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 512742bf [disable]
  UPDATE questions SET disabled = true WHERE id = '512742bf-f362-4d43-8fa9-158325afe1d3' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '4fd21d90d110fb076c879f96dde85c5f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 512742bf: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 516eac91 [disable]
  UPDATE questions SET disabled = true WHERE id = '516eac91-f234-40d5-ae2d-198b801aa8ad' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3a4e319018e93f4298a822e9c9ac492c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 516eac91: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 51b93c08 [lam]
  UPDATE questions SET explanation = 'تؤثر قوى المجال في الأجسام دون وجود تلامس مثل قوة الجاذبية والقوة المغناطيسية' WHERE id = '51b93c08-778c-4056-9da6-fcbc5ad43df4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd6f3d03853fee4b056d96f3a8587815a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 51b93c08: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 5261a33f [lam]
  UPDATE questions SET choices = '["التقطير التجزيئي", "التكسير الحراري", "تدوير المخلفات", "الاحتراق البخاري"]'::jsonb WHERE id = '5261a33f-f5e5-4bbd-b1b9-853259e8caa8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd27c1dd23e6988ccdaeee5f306aefc92';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 5261a33f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 52855cc8 [lam, disable]
  UPDATE questions SET question_text = 'فعل ما لا يستطيعون فعله                                                             والقدر', disabled = true WHERE id = '52855cc8-c461-42f4-9b46-26e3161d7dfd' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5b763a4260676bf15954743560e2b29d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 52855cc8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 52afe93d [lam]
  UPDATE questions SET question_text = 'المسؤول عن ميلان النبات' WHERE id = '52afe93d-6749-4b35-825c-540ceab2ada4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'fad59a361b84a4615b96c3a40e5c6631';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 52afe93d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 530b6424 [lam]
  UPDATE questions SET choices = '["الألدهيدات", "الكحولات", "الأحماض الكربوكسيلية", "الكيتونات"]'::jsonb, explanation = 'يحتوي علىCOOH وهو حمض كربوكسيلي، الألدهيدات تحتوي علىCHO ، الكحولات تحتوي علىOH ، الكيتونات تحتوي علىCO بالمنتصف' WHERE id = '530b6424-3143-4be5-b086-9580ac44bd00' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '04cb1aff3bf1c80edcdb9fc6ec17641a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 530b6424: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 53d1dd55 [lam]
  UPDATE questions SET choices = '["إقامة : صلاة", "نبع : ماء", "مرآة : صورة", "مطر : سحاب"]'::jsonb WHERE id = '53d1dd55-743a-4c37-90d9-b8c3ba90742a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'efe5aa33e9fa8e23c318c0eea2dc9314';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 53d1dd55: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 53eb972f [disable]
  UPDATE questions SET disabled = true WHERE id = '53eb972f-cd42-4b48-9073-342e7fe3f1b3' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9b26ad7d0c2abc1bf848787ad64db628';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 53eb972f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 5425952a [lam]
  UPDATE questions SET choices = '["تنفصل مكوناتها مع مرور الوقت", "مكوناتها مختلطة بانتظام ولا يمكن التمييز بينها", "تحدث فيها ظاهرة تندال", "تحدث فيها ظاهرة الحركة البراونية"]'::jsonb WHERE id = '5425952a-96d7-4f8b-bf59-923a3f5dd50f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6096be535aec7885919534ea730631c4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 5425952a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 55960854 [disable]
  UPDATE questions SET disabled = true WHERE id = '55960854-8c7c-4a60-9963-b5fb2b95e0f3' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '13fdfd6c630854cd4ef72be7b0bbaca4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 55960854: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 5937bb9f [disable]
  UPDATE questions SET disabled = true WHERE id = '5937bb9f-203e-466a-86bd-7d0272a86e0a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2e40b8531d1ff3f9e8f0c838ccb07506';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 5937bb9f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 5ffb4e1c [lam]
  UPDATE questions SET choices = '["كتاب : مقالات", "مجلد : قصص", "معجم : عبارات", "أطلس : خرائط"]'::jsonb, correct_choice = 'كتاب : مقالات' WHERE id = '5ffb4e1c-c9eb-44dc-8426-3fc1becb8631' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5e1c514a55534df1a09b77d3bb99440a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 5ffb4e1c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 612fd19d [lam]
  UPDATE questions SET question_text = '،طلب من بعض الطلاب جمع عينات لشوكيات الجلد أي المناطق المائية الآتية يجمعون منها؟' WHERE id = '612fd19d-2da4-4c2b-b278-2340051d9ac4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '291625b88f61fe5761ac58242ada2ef3';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 612fd19d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 61e119b6 [lam, disable]
  UPDATE questions SET choices = '["السلامة", "الأسى", "القناعة", "الضراعة"]'::jsonb, explanation = 'الخطأ السياقي: <b>الضراعة</b>. بقية الكلمات (السلامة, الأسى) تتوافق مع سياق الجملة، بينما «الضراعة» لا تنسجم مع المعنى العام وتحتاج استبدالها بكلمة مناسبة.', disabled = true WHERE id = '61e119b6-bc60-401f-9664-06aed6d34958' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '690b283907cb4532ebc17ca5b2e85902';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 61e119b6: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 6548fed8 [lam, disable]
  UPDATE questions SET question_text = 'على بناء خطوط  ..............من الاتصال والتفاهم بين      623              وذلك أفضل الأخلاق التي يصل صاحبها إلى ذروة ......... المؤسسة وجماهيرها', disabled = true WHERE id = '6548fed8-689a-45ea-9262-017b050f31a5' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '1e2ff34e6eed1f7030fe3275342e4365';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 6548fed8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 66323f7b [lam]
  UPDATE questions SET explanation = 'عندما تكون درجة البسط أكبر من المقام فأن النهاية في المالانهاية تكون في المالانهاية أو سالب المالانهاية على حسب إشارة معامل الحد الرئيس في البسط والمقام' WHERE id = '66323f7b-5297-4e93-b7a0-feb84b2d0336' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '83815597b5b8900361ffda66a19a435e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 66323f7b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 66479eda [lam]
  UPDATE questions SET choices = '["المحافظة على شكل الخلية", "عدم ثبات العضيات", "نقل المواد داخل الخلية", "إخراج الفضلات"]'::jsonb WHERE id = '66479eda-5c8c-4696-a999-aafc2b9e3b67' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b3960d65281ebe6f84b3dc03e64705d0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 66479eda: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 69384030 [lam]
  UPDATE questions SET question_text = 'قام باحث أحياء بدراسة الهندسة الوراثية لبعض النباتات وإمكانيات مقاومتها للحشرات وللأمراض، هذا الباحث يعمل :على' WHERE id = '69384030-3026-439e-9a45-89ef60305c73' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '632e5ee911f90a8d7d19a4a179eb7a1e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 69384030: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 6b84970f [lam]
  UPDATE questions SET choices = '["الحيود", "التداخل", "التراكيب", "الاستقطاب"]'::jsonb WHERE id = '6b84970f-7ea1-4ce7-9031-bb237c077e21' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'a021400893c51a5cabf8ad3283d006c0';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 6b84970f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 6eae3cfc [lam]
  UPDATE questions SET choices = '["تخزين الغذاء الفائض", "الاستجابة للمثيرات", "تخزين الفضلات", "المحافظة على الاتزان المائي للجسم"]'::jsonb WHERE id = '6eae3cfc-933c-4d28-bc35-8507ccd51359' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9aa09ee08e7e2ee0b74275615c548158';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 6eae3cfc: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 6ef05a06 [lam]
  UPDATE questions SET question_text = 'مؤشر : علامة', choices = '["شمس : شروق", "استهلال : ختام", "ملخص : موجز", "طليعة : جيش"]'::jsonb WHERE id = '6ef05a06-76ea-4de3-90c6-4495ba28a782' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'df5ffb3ced40e1f372f6eb418660f53e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 6ef05a06: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 735e9170 [disable]
  UPDATE questions SET disabled = true WHERE id = '735e9170-bfff-41ae-906d-fe62e96319fc' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f05ca2b2d2eaeeba92a6d089431c6a8e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 735e9170: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 73765fd8 [disable]
  UPDATE questions SET disabled = true WHERE id = '73765fd8-caca-48d2-bdf7-7d6ece6a1932' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e43e89e7f2174840105a37142042a762';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 73765fd8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 74a30465 [lam]
  UPDATE questions SET explanation = 'لا يكون هناك نظير عندما تكون محددة المصفوفة تساوي صفر ، 3k=(-2)(6)' WHERE id = '74a30465-24ae-486b-af28-1c18906e4d48' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '95341239fc38106f790c4a9893753b4b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 74a30465: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 78db1e0a [lam]
  UPDATE questions SET question_text = 'إذا كانت قيمة السهم عند الاكتتاب لإحدى الشركات هي90 ريالًا وبعد ثلاثة أشهر من تاريخ الاكتتاب أصبحت قيمة السهم لهذة الشركة96 ريالًا، فإذا افترضنا أن قيمة السهم على شكل متتابعة حسابية شهرية، فإن القيمة المتوقعة للسهم بعد سبعة أشهر من تاريخ :الاكتتاب هي' WHERE id = '78db1e0a-2eee-4e9d-a03d-d00939024710' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '89e479d4b857b41c71072983b46b9caa';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 78db1e0a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 78de34b0 [lam]
  UPDATE questions SET question_text = 'لكي تتبرع بالدم لصديقك الذي فصيلة دمهO فلا بد أن تكون فصيلة دمك' WHERE id = '78de34b0-fb5e-4e44-b2bb-2ec8e225b45a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '45564449a5f076326621d60e28b93046';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 78de34b0: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7a3008d7 [lam]
  UPDATE questions SET question_text = 'أي المعادلات التالية تمثل قانون جهد الخلية؟' WHERE id = '7a3008d7-14d0-4c7d-8ce0-1fb7f8ae303e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3ab576186c6f4c1ed2de50a557a27483';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7a3008d7: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7a95daeb [disable]
  UPDATE questions SET disabled = true WHERE id = '7a95daeb-c8a7-4ba1-a7df-63cac82bc51d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '8b05fa54ef2c6892e3a3cd03ade6a120';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7a95daeb: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7afc4e85 [disable]
  UPDATE questions SET disabled = true WHERE id = '7afc4e85-16bb-4dc9-bcea-3f1046056c30' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '650f2ccb5468c780d77596fc0acc04c1';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7afc4e85: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7c27509d [lam]
  UPDATE questions SET choices = '["دراسة : فصل", "معلقة : طحن", "صلاة : إسلام", "ألم : مرض"]'::jsonb WHERE id = '7c27509d-4cb7-49cd-b165-49cfdbd29c74' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2f6570de4818aa6328b278f71c3ba714';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7c27509d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7c8afb28 [lam]
  UPDATE questions SET choices = '["متر : قياس", "شمس : قمر", "كبريت : نور", "قربة : امتلاء"]'::jsonb WHERE id = '7c8afb28-b6e1-4026-919e-d30a4bc84988' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'de53ff974ddd784c0ec0ec3dfb96d0ff';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7c8afb28: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7d32477b [lam]
  UPDATE questions SET question_text = 'الموصلات فائقة التوصيل تكون مقاومتها :' WHERE id = '7d32477b-58ca-4fc8-aab0-c5dfa88b626e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6878a427209deadbf055a8b588d4b82b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7d32477b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7dbfa44f [lam, disable]
  UPDATE questions SET question_text = 'البروتين يحتوي على نيتروجين ولا حياة بدون بروتين ،إذا لا                                   إن لحظة  ..........تساوي أحيانا حياة من الخبرة', disabled = true WHERE id = '7dbfa44f-baf2-4df6-a6f5-1160a392365d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2f2c1dc94b15d25cdb161c2082853ef8';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7dbfa44f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7e1ebf0c [lam]
  UPDATE questions SET choices = '["دراسة : فصل", "معلقة : طحن", "صلاة : إسلام", "ألم : مرض"]'::jsonb WHERE id = '7e1ebf0c-1e36-4fb9-8dae-21730d99efd7' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd20214cc1f3b6117e0c12357689f2e22';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7e1ebf0c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7e512b89 [disable]
  UPDATE questions SET disabled = true WHERE id = '7e512b89-1184-4aaf-a438-81207e8a6960' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c0ad60b6b0053f6fe129f71afa5320d9';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7e512b89: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 7e79ea45 [disable]
  UPDATE questions SET disabled = true WHERE id = '7e79ea45-f024-4cc1-9e72-561b0a99e8b8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '97e75dbe284d1eb0663b14487196a587';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 7e79ea45: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 812458c5 [lam]
  UPDATE questions SET choices = '["عمل : قوة", "عصر : ظهر", "حلقة : سلاسل", "زهور : حديقة"]'::jsonb WHERE id = '812458c5-028e-4b15-8458-b90e0f5401c9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '39bae2b60e59a6304fe428e36486787b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 812458c5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 81a81efb [lam, disable]
  UPDATE questions SET question_text = 'المعاصر تعد محض خيال ،لأن الوقائع الموثقة جيدا في هذا', disabled = true WHERE id = '81a81efb-c94a-4abf-94b3-7948bd128a85' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '4dc199382e24e216c7608daf54a2ed06';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 81a81efb: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 82de8cfb [lam]
  UPDATE questions SET choices = '["باصات : حافلات", "حيوانات : غابة", "غريب : فريد", "سيارة : طريق"]'::jsonb, correct_choice = 'باصات : حافلات' WHERE id = '82de8cfb-8879-4496-bb75-973078f6190a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'fc624bc429e401424ed3e19a569b166b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 82de8cfb: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8358ddd0 [lam]
  UPDATE questions SET choices = '["المسافة الموازية لمحور الدوران حتى نقطة التاثير", "المسافة العمودية من محور الدوران حتى نقطة التأثير", "الازاحة الموازية لمحور الدوران حتى نقطة التاثير", "الازاحة الزاوية من محور الدوران حتى نقطة التأثير"]'::jsonb WHERE id = '8358ddd0-caa7-41dd-b30b-806b4ed984d8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '25cfc79e2f91049f7cc308a639e6a442';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8358ddd0: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 850d9f14 [lam]
  UPDATE questions SET choices = '["شمس : شروق", "استهلال : ختام", "ملخص : موجز", "طليعة : جيش"]'::jsonb WHERE id = '850d9f14-fa3d-4c29-bd73-d75b8b91d14c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'fb0e14e14f86814d02eeb64e3ea979df';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 850d9f14: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 85a6f378 [disable]
  UPDATE questions SET disabled = true WHERE id = '85a6f378-c6e3-4b88-8399-50026ba62741' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'bae07fe39a31cd52f79ec6ad0234cbbe';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 85a6f378: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 85aae531 [disable]
  UPDATE questions SET disabled = true WHERE id = '85aae531-c13d-46bf-bee3-42f221545e42' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'dc3d07a6adabcd791785eee537d7a7e4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 85aae531: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 863ba1b9 [lam]
  UPDATE questions SET choices = '["مبنى : مهندس", "مكتب : وزير", "فلاح : مزرعة", "جهل : علم"]'::jsonb WHERE id = '863ba1b9-498c-4be8-a8d9-7923eddf0394' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '60710bcf414ec141347ba86e0133f698';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 863ba1b9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 86565018 [lam]
  UPDATE questions SET choices = '["سيارة : قائد", "تشغيل : انطلاق", "سيارة : طائر", "عمال : مصنع"]'::jsonb WHERE id = '86565018-5766-4b5c-b06f-6c7f1e268627' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b1abc1845792fa873eca086ea14602dc';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 86565018: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 87bdafad [lam]
  UPDATE questions SET question_text = 'أي نوع من الاضمحلال لا يغير عدد البروتونات أو النيترونات في النواة؟' WHERE id = '87bdafad-9651-4790-9b4f-eb21f4fa0f04' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '963344fe453a10e76cead2c1dec11343';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 87bdafad: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 87e91d4f [lam]
  UPDATE questions SET question_text = 'عدد المجالات الفرعية في المجال الثانويd' WHERE id = '87e91d4f-7115-4d72-bfa9-2aa86715ea4c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2d719340e6a6ab16288cdc9e546e081b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 87e91d4f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8898475f [lam]
  UPDATE questions SET question_text = 'أي الوحدات التالية صحيحة للتعبير عن المولارية؟', explanation = '( المولارية تمثل عدد مولات المذاب في كل وحدة حجمL)' WHERE id = '8898475f-8fdf-4ece-882f-a87a5becb0b0' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '13ba77cd703fc2ce191835ca2abbaca1';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8898475f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8c2f9926 [lam, disable]
  UPDATE questions SET choices = '["لفهم", "الصحيح", "الاستماع", "كاملا"]'::jsonb, disabled = true WHERE id = '8c2f9926-2cd2-455c-b79d-ad9150fedf32' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f740daf33164eb914d3e3ceb4db3aec1';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8c2f9926: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8d72d16a [lam]
  UPDATE questions SET question_text = 'وجد احفورة لمخلوق ما ولوحط امتلاكها لأقدام أنبوبية فإنه', choices = '["من الديدان الاسطوانية", "من الديدان الحلقية", "من ش وك يات الجلد", "من الرخويات"]'::jsonb, explanation = 'تمتاز شوكيات الجلد بامتلاكها أقدام انبوبية' WHERE id = '8d72d16a-787d-4e51-9d18-baee326a0023' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '8dfccee9e5c0a4d6c233709270f34a6f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8d72d16a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8e11de08 [lam]
  UPDATE questions SET question_text = 'عدد مولات𝟏𝟎𝟐𝟑× 𝟏.𝟓 :جزيئًا من ثاني أكسيد الكبريت تساوي (عدد افوجادرو𝟔. 𝟎𝟐× 𝟏𝟎𝟐𝟑 (' WHERE id = '8e11de08-bd0f-46d3-af0d-f1fa0b45312f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9cb2c0b54eab66e55c93b7f2f44e470f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8e11de08: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 8fd369b9 [lam]
  UPDATE questions SET choices = '["ليل : نهار", "نوم : ظلام", "إرسال : استقبال", "عمل : نوم"]'::jsonb WHERE id = '8fd369b9-4d6b-4626-a043-0bc6de1c7e3a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '37697f6903bf7c11add5a7f743cb3d05';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 8fd369b9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 91e74ba3 [lam]
  UPDATE questions SET question_text = 'عبارة الطاقة لا تفنى ولا تستحدث بل تتحول من شكل إلى شكل آخر' WHERE id = '91e74ba3-d598-4a42-a2cf-d56ebfb452dc' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'cd14fd75afe4a9da9bc6230bbf8ca92a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 91e74ba3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9288cfc1 [lam]
  UPDATE questions SET question_text = 'كل إناء  ........بما جعل فيه ،إلا إناء العلم فإنه .......   567        يجب أن يكون سهمك  .........ولكن لا تستعجل في ...........' WHERE id = '9288cfc1-2224-494d-9b4f-c82b0af468a9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ecba5056497e680635344e5f7cb75ebf';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9288cfc1: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9315ef6e [lam]
  UPDATE questions SET explanation = 'الخلية الكهروكيميائية تستعمل تفاعلات الأكسدة والأختزال لإنتاج طاقة كهربائية أو تستعمل الطاقة الكهربائية لإحداث تفاعل كيميائي' WHERE id = '9315ef6e-3f28-4cc9-b40b-898facb4be4c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '1f77c700c9f1d7fd3762e204059c08a8';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9315ef6e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 93b76a48 [lam]
  UPDATE questions SET question_text = 'إقلاع : تحليق', choices = '["تحدث : انصات", "تشغيل : انطلاق", "كهرباء : مولد", "غريب : موطن"]'::jsonb WHERE id = '93b76a48-232a-437e-b919-075e0306f355' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '78daedd56faf36c8f704aadfa1ca2067';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 93b76a48: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9573fc99 [lam]
  UPDATE questions SET question_text = 'استمع سعد لإذاعة موجتها4.5 :ميغا هرتز وهذا يعني أن التردد يساوي بالهيرتز' WHERE id = '9573fc99-8473-4f60-8733-5e2fefbcda08' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b15525937dccab33b2f6a1b41b4e0197';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9573fc99: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 97075611 [lam]
  UPDATE questions SET choices = '["قرصية", "مشطية", "معينية لامعة", "صفائحية"]'::jsonb WHERE id = '97075611-b1d3-41c7-98fe-96b391f808bb' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6efcba462579148e99430d707f95cbe2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 97075611: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9dbb0180 [disable]
  UPDATE questions SET disabled = true WHERE id = '9dbb0180-8c57-45d5-af75-4210f4c6095a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '773780484b6dd32f3938e12b2db5808e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9dbb0180: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9df11f57 [lam]
  UPDATE questions SET choices = '["باصات : حافلات", "حيوانات : غابة", "غريب : فريد", "ظلام : نور"]'::jsonb, correct_choice = 'باصات : حافلات' WHERE id = '9df11f57-373d-4d41-8ed9-30ae19fbbae4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e6b4a39b99d195ddefd8a50ef00848aa';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9df11f57: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9e2036d9 [lam, disable]
  UPDATE questions SET question_text = 'الرياح المتلبدة بالغيوم توحي بهطول الأمطار   783        الإنسان بلا هدف كالسفينة بلا دفة يبدأ به الأمر إلى الصخور', disabled = true WHERE id = '9e2036d9-06e2-4730-923d-a1b7840b76dc' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd105ab5de53a37f1076c7ade002abde6';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9e2036d9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9ec8c877 [lam]
  UPDATE questions SET choices = '["نحن : هم", "الذين : هؤلاء", "اللذان : هتان", "خيط : ثوب"]'::jsonb WHERE id = '9ec8c877-ec52-48cd-ae68-950b74958374' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '15232db0a418608352d17b6204136af7';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9ec8c877: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- 9eef52c7 [lam]
  UPDATE questions SET choices = '["درجة الانصهار", "درجة الغليان", "درجة التبخر", "درجة التسامي"]'::jsonb WHERE id = '9eef52c7-0ed8-4eeb-9827-83766c5c791b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5928e1d1f57a7ed7896c2d6f968d6000';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف 9eef52c7: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a029dc46 [lam]
  UPDATE questions SET choices = '["دواء : علاج", "غاز : نار", "قمح : غذاء", "فاكهة : برتقال"]'::jsonb WHERE id = 'a029dc46-6695-4959-8582-3cf719006d34' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b1fc82c706c748ec8c519592760bd219';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a029dc46: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a0f9cb09 [disable]
  UPDATE questions SET disabled = true WHERE id = 'a0f9cb09-64fd-4c36-af08-979670fb764e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'daadb4ae8d3f398ad507f53a0c9227c7';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a0f9cb09: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a32af796 [disable]
  UPDATE questions SET disabled = true WHERE id = 'a32af796-1864-451b-bd85-65dfe907a7d1' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '452d76e3929d27bf6130c91bfe184894';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a32af796: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a462e755 [lam]
  UPDATE questions SET choices = '["صلاة : سلام", "دائرة : مربع", "حديقة : زهور", "عالم : مختبر"]'::jsonb WHERE id = 'a462e755-525f-4446-8e43-ab8b9d800204' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '7a3fb8ac7b143819cc91f385dad4fe36';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a462e755: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a492132e [disable]
  UPDATE questions SET disabled = true WHERE id = 'a492132e-1842-4e29-a99b-bfa6ab96591d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '05bcd05ae356eb44ab8eaac54481d7c2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a492132e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a4f6a1f8 [disable]
  UPDATE questions SET disabled = true WHERE id = 'a4f6a1f8-046f-49dc-8e9f-c5bf6859a9bf' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '78d6b23f667ae4c32d31a5a999100c62';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a4f6a1f8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a6605217 [lam]
  UPDATE questions SET choices = '["الحيود", "التداخل", "الاستقطاب", "التدفق"]'::jsonb WHERE id = 'a6605217-3e33-43c3-9257-f8d7f2c46609' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '20b5cd9469788397c3ff9e57b8202751';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a6605217: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a6648f2c [lam]
  UPDATE questions SET choices = '["الانتشار", "التمدد", "التفاعل", "التدفق"]'::jsonb WHERE id = 'a6648f2c-7cfa-4810-bd6b-3db7537af8ee' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b38c1fa8aafa6fb8ebeff579be577c0c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a6648f2c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a67c5e1b [lam]
  UPDATE questions SET choices = '["مبنى : مهندس", "مكتب : وزير", "فلاح : مزرعة", "جهل : علم"]'::jsonb, correct_choice = 'فلاح : مزرعة' WHERE id = 'a67c5e1b-0352-4952-96bc-ef05090151f5' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '8b783ca8eb72a0fdee261b8098a6c5e9';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a67c5e1b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- a78f5f6b [disable]
  UPDATE questions SET disabled = true WHERE id = 'a78f5f6b-56f4-4807-8195-4f6a2f276fc4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '83ac893f0191554b5f5c1b631e41fc54';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف a78f5f6b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- aad8a7dd [lam]
  UPDATE questions SET choices = '["بيت : أولاد", "رحمة : عفو", "مركز : نفوذ", "كرم : شح"]'::jsonb WHERE id = 'aad8a7dd-d3e3-4bfe-8bee-24fb75b46ea1' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '87b1e51ba83eb684458ddede7d63fb09';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف aad8a7dd: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ac420461 [lam, disable]
  UPDATE questions SET question_text = 'الكاذب ،فيجب علينا التثبت من  ............كما قيل قديما             613                                             بالحكمة لا يتسع .......... وما آفة الأخبار إلا .......... الأفق ،وإنما المشكلة في الفئران التي تأكل في ...........           614                                                                               609 ونحن عنها غافلون', disabled = true WHERE id = 'ac420461-0249-461f-a636-7303b2b78773' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ae2e361adba36a364316f90b30bfb5f5';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ac420461: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ae99e0c3 [lam]
  UPDATE questions SET choices = '["ذكي : ساذج", "خطة : حرب", "حمل : ولادة", "دائرة : شمس"]'::jsonb WHERE id = 'ae99e0c3-e8d8-4ce4-a4ba-e425f66f8bfe' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c16d317f88c996672ba9383638f82011';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ae99e0c3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b237c9f9 [lam]
  UPDATE questions SET question_text = 'أي التالي يصنف تفاعل إحلال؟', explanation = 'تفاعلات الإحلال يتم فيها تبادل الأيونات بين المادتين الداخلتين في التفاعل' WHERE id = 'b237c9f9-6e95-428b-ae28-6bb167c27f08' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'dab2ad16d51abac1f1057cdf2b0b1b62';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b237c9f9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b3e0f697 [lam, disable]
  UPDATE questions SET question_text = 'المخدرات طريقها  ........وعاقبتها ........       606                    لا تجادل ........فقد يخطئ الناس في ........بينكما .........', disabled = true WHERE id = 'b3e0f697-d7f7-4d2f-8eb8-b357d2a71a16' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'de90476afbd056fcceab0e72fc8c0fbd';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b3e0f697: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b46c1e21 [disable]
  UPDATE questions SET disabled = true WHERE id = 'b46c1e21-0609-4547-b8a7-1a37b0c87bee' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '33a932bde025a16cc294fea57379bc96';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b46c1e21: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b55e2fac [lam]
  UPDATE questions SET question_text = 'تسمى عملية خلط :المجالات الفرعية لتكوين مجالات جديدة بعملية' WHERE id = 'b55e2fac-813d-418c-81a8-f2ac71ba1a3d' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '7974b3f82b68a8cc9b08f5bde9a777db';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b55e2fac: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b68929db [lam]
  UPDATE questions SET choices = '["ثابت بلانك", "طول الموجة", "التردد", "كتلة الجسيمات"]'::jsonb WHERE id = 'b68929db-6ea6-49b7-8b29-8cfb241bc0ae' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9a385de420892de492f15c1ecc67a1ee';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b68929db: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b694e73f [lam]
  UPDATE questions SET question_text = 'لأي جسم يسقط سقوطً ا حرًا فأن سرعته بعد ثانيتين تزداد بمقدار' WHERE id = 'b694e73f-b51d-410c-915e-dc0a16cf4b20' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e4e31dfecf78c3bff3643657a1d8e61f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b694e73f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b765fcc3 [lam]
  UPDATE questions SET question_text = 'بازلاء : فول' WHERE id = 'b765fcc3-bd1f-43f9-842a-fa37548c3e1a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6736201e9a278f729d0e786007fd14cb';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b765fcc3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b8953a35 [lam]
  UPDATE questions SET question_text = 'ما الذي ينتج عن أكسدة الكحولات الثانوية؟', explanation = 'أكسدة كحول أولية ينتج ألدهيدات، أكسدة كحولات ثانوية ينتج كيتونات' WHERE id = 'b8953a35-00f6-4382-883a-0e5cabe2ff4c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '1f2b451fa61a484babf9a5dc6fd57024';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b8953a35: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- b9fadb4b [lam, keyfix]
  UPDATE questions SET question_text = 'البصرة أقدم المدن الإسلامية خارج الجزيرة العربية، وبنيت عام 14 قبل الهجرة.', correct_index = 3, correct_choice = 'قبل', explanation = 'الخطأ السياقي: <b>قبل</b>، والصواب «بعد» أو «للهجرة».<br>المدن الإسلامية لم تُبنَ إلا بعد الهجرة، والبصرة بُنيت في عهد عمر بن الخطاب رضي الله عنه.' WHERE id = 'b9fadb4b-de0f-4278-ac7c-ca40179b7d03' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '826dfa924cdd14a6449b7b2eaeed6d3d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف b9fadb4b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ba1f3165 [lam]
  UPDATE questions SET question_text = 'عدد المجالات الفرعية للمستوى الثانويP :هو' WHERE id = 'ba1f3165-48eb-4062-b10d-e33d50d828e1' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd70b8c892c2f8937ea7a99215bbabfd3';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ba1f3165: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ba62c610 [lam, disable]
  UPDATE questions SET question_text = 'الزم طريق  ........ولا يضرك قلة ..............', disabled = true WHERE id = 'ba62c610-c3f1-47c7-8782-2f3214b585bf' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'aa4648fa97b694d4870f97998db26a60';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ba62c610: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- bcde79d5 [lam]
  UPDATE questions SET choices = '["قاعدة هند", "مبدأ أوفباو", "مبدأ باولي للاستبعاد", "مبدأ هايزنبرج للشك"]'::jsonb WHERE id = 'bcde79d5-8480-45c9-8aa0-e6bd62fc30d2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'abaec12a55971fb4ff4ebdc46b5a9c8c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف bcde79d5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- bddb5d99 [lam]
  UPDATE questions SET choices = '["مواقع : شبكة", "إهمال : إخفاق", "علامة : تمييز", "نص : هامش"]'::jsonb WHERE id = 'bddb5d99-af5b-472c-b565-c6324d470d7c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'c15ae33606da6e182155094b80eadec2';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف bddb5d99: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- be73373b [lam, disable]
  UPDATE questions SET question_text = 'بل في الفئران التي تأكل  ..........ونحن غافلون             605        للأفراد  ،وإنما يتعداه إلي  .......لتدعيم المشروعات التنموية', choices = '["تنعكس", "طرافها", "الاعلام", "-جنباتها"]'::jsonb, disabled = true WHERE id = 'be73373b-2d6b-47fe-b451-eb7ec1bfd417' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2eabe26ee7a3eaf9ccf9c6012c8c4179';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف be73373b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- be96ced8 [lam]
  UPDATE questions SET choices = '["مستشفى : علاج", "صالة : طعام", "مسجد : طمأنينة", "حديقة : حيوانات"]'::jsonb, correct_choice = 'مستشفى : علاج' WHERE id = 'be96ced8-0a25-4ffa-9edb-1ed1a1013b69' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'aadd7da0886cfec935926cae79d99369';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف be96ced8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- c4eb9c2b [disable]
  UPDATE questions SET disabled = true WHERE id = 'c4eb9c2b-3097-4b91-b9e2-cd1bfc2cd5a2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5133f3f86b0298235f5ffe76582e3184';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف c4eb9c2b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- c51b4bc3 [lam]
  UPDATE questions SET choices = '["تفوق : نجاح", "بيع : شراء", "صلاة : عبادة", "تفريط : إفراط"]'::jsonb, correct_choice = 'صلاة : عبادة' WHERE id = 'c51b4bc3-09f2-421a-b54e-1e694135d9e9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e75fac85bfeb8b142b7ce2fdf9c83703';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف c51b4bc3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- c54e1152 [lam]
  UPDATE questions SET choices = '["فلاة : صحراء", "عصر : ظهر", "حلقة : سلاسل", "زهور : حديقة"]'::jsonb, correct_choice = 'حلقة : سلاسل' WHERE id = 'c54e1152-df48-4f4b-81b0-0ed3eba8bff1' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '0a7e4368d3b4ad0656967ec0535b3c33';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف c54e1152: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- c8148846 [lam, keyfix]
  UPDATE questions SET question_text = 'كل إناء ....... بما جعل فيه، إلا إناء العلم فإنه .......', choices = '["يفيض – يتسع", "يمتلئ – يفرغ", "يضيق – يتسع", "يرتفع – ينخفض"]'::jsonb, correct_index = 2, correct_choice = 'يضيق – يتسع', explanation = 'الإجابة: <b>يضيق – يتسع</b>.<br>القول المأثور: «كل وعاء يضيق بما جعل فيه إلا وعاء العلم فإنه يتسع»؛ فالأوعية تضيق بما يوضع فيها، أما العلم فكلما زاد اتسع له صدر صاحبه.' WHERE id = 'c8148846-5bd4-45e3-9585-69679e545524' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '94030601d3e454888565fe3e1fb785a6';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف c8148846: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- c8498021 [lam]
  UPDATE questions SET question_text = 'تتكون الوحدات البنائية البروتينية للخلايا التي نشأت منها أجسام المخلوقات الحية' WHERE id = 'c8498021-b9e5-4ea5-ab44-5c41cf369da2' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '22ae295c889f18c9c3d5379c72957089';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف c8498021: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- cbdc9382 [lam]
  UPDATE questions SET choices = '["كتاب : مقالات", "مجلد : قصص", "معجم : عبارات", "أطلس : خرائط"]'::jsonb WHERE id = 'cbdc9382-e3ea-4bc6-bd4f-149b8bb9c076' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'feed588637ab07c90103309d472c6520';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف cbdc9382: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- cc36c8c3 [lam]
  UPDATE questions SET question_text = 'في إحدى القضايا الجنائية وجد المحققون أجزاء من الشعر لأحد المجرمين في مكان الجريمة مما ساعد في توفير كميةDNA لتحليل بالصمة الوراثية لمقارنتها بالبصمة الوراثية لعدد من أصحاب السوابق. حسب الجدول، أي المشتبه بهم قام بالجريمة؟' WHERE id = 'cc36c8c3-bac8-4639-bc61-d660343a1caf' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5842246c65db5b45023346b1380a606c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف cc36c8c3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- cc8e4d6b [lam]
  UPDATE questions SET choices = '["سخط : رضا", "غلام : شاب", "نجار : خشب", "خياط : قماش"]'::jsonb, correct_choice = 'غلام : شاب' WHERE id = 'cc8e4d6b-08cf-4ecf-9ad3-40495dd99d48' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '617b101696445c345509c1f7dbc60af7';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف cc8e4d6b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ce2f38a3 [lam, disable]
  UPDATE questions SET question_text = 'استعارة كتاب من المكتبة يعد نوعا من  ............لأن القارئ      557', disabled = true WHERE id = 'ce2f38a3-56c0-40f6-9f5e-e06f6cdef18c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ab4473a37be84b743e49b435449105da';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ce2f38a3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ceba5603 [lam]
  UPDATE questions SET question_text = '،التغير في الجماعة من معدلات ولادات ووفيات عال إلى معدلات ولادات ووفيات منخفض يطلق :عليه', choices = '["النمو الصفري", "القدرة الاستيعابية", "التركيب العمري", "التحول السكاني"]'::jsonb WHERE id = 'ceba5603-4378-4872-9393-50752e0f928b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '530c6593c1f070e987ac5c29a3f4b88d';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ceba5603: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d0d31f4b [disable]
  UPDATE questions SET disabled = true WHERE id = 'd0d31f4b-bf65-46f2-9df3-adf844df7424' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5d7b45375cba6a5d79f02c8792f61614';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d0d31f4b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d3640288 [lam]
  UPDATE questions SET explanation = 'حسب نظرية دي برولي فإن الجسيمات المادية تبث موجات لها طول موجي يصعب ملاحظته' WHERE id = 'd3640288-2f94-4c25-808b-b0ed4101c664' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '90942e1330ce20b8fe9aaede6a3868d9';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d3640288: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d392dc45 [lam]
  UPDATE questions SET choices = '["طائرة : مواصلات", "فواكه : تفاح", "حظيرة : حيوانات", "نمر : إفتراس"]'::jsonb, correct_choice = 'طائرة : مواصلات' WHERE id = 'd392dc45-5693-4afc-99de-b1b31f65c4f4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6c0c747f36e478403edfa1ada188eff5';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d392dc45: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d464f989 [lam]
  UPDATE questions SET choices = '["جامده", "سائله", "بلازما", "غازيه"]'::jsonb WHERE id = 'd464f989-d67d-417d-8b66-af158ab9d2b4' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '2e3c46f79c42c164e160f0d11361073f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d464f989: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d62f0ab8 [lam, disable]
  UPDATE questions SET question_text = 'من علامات النجاح في النهايات تطويره في البدايات والقدر أحدا يستمع', disabled = true WHERE id = 'd62f0ab8-f20d-4931-b729-23e651cfbc66' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '7d903fa8e4d8c57c01e24859f95614de';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d62f0ab8: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d6b460be [lam, disable]
  UPDATE questions SET question_text = 'النجاح الحقيقي لا  .......إلا بالعمل ...........   565                                إذا  ............الحكيم كان  ...........لك', disabled = true WHERE id = 'd6b460be-3896-400b-8660-8f0a6b06563c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3cb2138d92e42b125df761cf67bf6f39';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d6b460be: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d7851be2 [lam]
  UPDATE questions SET choices = '["الاتزان الكيميائي", "المادة المحفزة", "التعادل", "سرعة التفاعل"]'::jsonb WHERE id = 'd7851be2-d732-435a-9528-db4899eb096e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e226b1e17200bcfcc0acc872d2ff9a72';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d7851be2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- d8c70202 [disable]
  UPDATE questions SET disabled = true WHERE id = 'd8c70202-944c-40f3-a221-26bbd4eeeb1c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'dd925fe720b9e8cb6c06922d82be99b4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف d8c70202: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- da175160 [lam]
  UPDATE questions SET question_text = 'أكسده الكحولات تنتج' WHERE id = 'da175160-9402-40b3-b00d-c4ba028802cc' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3e444ae8a6acd9e630db2b6a5d289471';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف da175160: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- da2725de [lam]
  UPDATE questions SET choices = '["الايثار", "الهجرة", "جمع الطعام", "التعود"]'::jsonb WHERE id = 'da2725de-e4d6-46d8-9937-7f8525e6cfee' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '86b182814aaec42a6d87f221799701d3';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف da2725de: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- db0423b2 [lam, disable]
  UPDATE questions SET question_text = 'كل أم تنجب ذكرا ولكن  ............تنجب رجلا ........ملامح.', disabled = true WHERE id = 'db0423b2-4e62-4f5c-abd1-a375a6cf5a8e' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6615286ccd471feec392d214e219bdee';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف db0423b2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- dba9cc50 [keyfix]
  UPDATE questions SET question_text = 'الرجل الحسن من يصدق لسانه، ويتحمل خيرات جيرانه.', correct_index = 2, correct_choice = 'خيرات', explanation = 'الخطأ السياقي: <b>خيرات</b>، والصواب «أذى» أو «إساءة».<br>الإنسان لا يحتاج إلى أن يتحمل خير جيرانه، وإنما يُمدح بتحمل أذاهم والصبر عليه.' WHERE id = 'dba9cc50-2597-474c-b0ed-2da323644584' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3d2d2801a13929735098f5f064af9ddf';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف dba9cc50: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- dde4ed2f [lam]
  UPDATE questions SET explanation = 'الأدرينالين هو المسؤول عن زيادة نبضات القلب وهو مرادف للأبنيفرين' WHERE id = 'dde4ed2f-7f1f-47a4-92da-01cbfcbdd8b5' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ee0d5862af33d8b12546274b0794af9c';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف dde4ed2f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- dec55595 [lam]
  UPDATE questions SET choices = '["يوم : أسبوع", "شعبان : رمضان", "عامل : ورشة", "الثلاثاء : الأربعاء"]'::jsonb WHERE id = 'dec55595-79e1-45d0-bde1-e7f417075546' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'd39ed03ca0e494aca6f62bb9a62f5309';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف dec55595: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e1eddfc2 [lam]
  UPDATE questions SET question_text = 'يتحلل الماء إلى عناصره الأساسية الهيدروجين والأكسجين حسب المعادلة الكيميائية الموزونة الآتية𝟐𝑯𝟐𝑶(𝒍) →𝟐𝑯𝟐(𝒈) + 𝑶𝟐(𝒈) ما كمية غاز الأكسجين بالجرامات الناتجة من تحلل𝟑. 𝟎𝟎𝒎𝒐𝒍 من الماء؟ إذا علمت أن الكتلة الذرية للأكسجين هي𝑶= 𝟏𝟔𝒈/𝒎𝒐𝒍' WHERE id = 'e1eddfc2-78bc-41ac-9482-d23277997e9a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'fef3f0aeaed3e982526dcd17e674bdf4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e1eddfc2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e3748d23 [lam]
  UPDATE questions SET choices = '["رجل : ركبة", "شعر : رأس", "صلاة : عبادة", "نهر : سمك"]'::jsonb WHERE id = 'e3748d23-3995-4ee8-8e9e-921d37ce6f9f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3105f8e758b000ad886a8ba97444a3d7';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e3748d23: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e4cee5a0 [lam]
  UPDATE questions SET question_text = 'عملية  ..........المستقبل ليست عملية سهلة ،لأن الغد                                إذا مدح الطيب زاد  ...........والخسيس زاد ........... ........ملامح.' WHERE id = 'e4cee5a0-219f-4bcc-b29f-7fd5d9c44bf8' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f155cc4b377ce5daa4a1a0b31c392383';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e4cee5a0: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e5cc2bdb [lam]
  UPDATE questions SET choices = '["كاتب : إبداع", "شجرة : ثمرة", "طبيب : علاج", "جراحة : طبيب"]'::jsonb, correct_choice = 'طبيب : علاج' WHERE id = 'e5cc2bdb-decc-44a6-b4cf-41b341a4b8d3' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '078c0bbd4dca615c9ee8270fcae0badc';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e5cc2bdb: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e7d216f5 [lam, keyfix]
  UPDATE questions SET question_text = 'الحوار الناجح لا يجب الركون إليه؛ لأنه يؤدي إلى نتائج مرذولة.', correct_index = 0, correct_choice = 'الناجح', explanation = 'الخطأ السياقي: <b>الناجح</b>، والصواب «العقيم» أو «الفاشل».<br>الحوار الذي يؤدي إلى نتائج مرذولة لا يوصف بالنجاح، فوصفه بالناجح يناقض آخر الجملة.' WHERE id = 'e7d216f5-10fb-45c5-9406-ceb480464eb5' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f4e3b15fdcbdee1503bb6beb83e64788';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e7d216f5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- e8d6dff2 [lam]
  UPDATE questions SET question_text = 'صلاة : وضوء' WHERE id = 'e8d6dff2-f371-4e8d-b0d7-fec5395b7755' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9b598faa6cb2c2892df49d5e391bbc96';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف e8d6dff2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ec8f180a [lam, disable]
  UPDATE questions SET question_text = 'هناك لصوص حقيقيون لا يعاقبهم القانون وهم يسرقون منك محفظتك', disabled = true WHERE id = 'ec8f180a-e1c3-4883-a40c-e5c03392cf6c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9ca85d9d40c103262a8fba3ebc070b3e';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ec8f180a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ecc3ea0c [lam]
  UPDATE questions SET choices = '["أكل : شبع", "سيارة : مقود", "فعل : قول", "هذا : هؤلاء"]'::jsonb WHERE id = 'ecc3ea0c-7ee6-49f3-9acb-6b3776a1145b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '9770bf971121c5ad2cffe653de4df878';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ecc3ea0c: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ed3562a4 [lam]
  UPDATE questions SET choices = '["طول خيط البندول", "كتلة ثقل البندول", "سعة الاهتزازة", "حجم البندول"]'::jsonb WHERE id = 'ed3562a4-57b9-43db-a7ba-6a365bc57b56' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'cfc0b771647fc9e08894c8dc139800bd';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ed3562a4: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ee0270a7 [lam]
  UPDATE questions SET explanation = 'المادة المحددة للتفاعل هي التي تتسهلك كاملة في التفاعل ويتوقف التفاعل عند استهلاكها' WHERE id = 'ee0270a7-c7c5-43ad-9ff3-022d17b1302f' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '0f8161adf871d9166cc72a41482da354';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ee0270a7: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ee0f2881 [lam, disable]
  UPDATE questions SET question_text = 'لا تجعل الماضي ........فيليهك عن الأمور ........في الحياة .........', disabled = true WHERE id = 'ee0f2881-4be2-4873-8d82-660163d591ad' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '86d59dffa994cd96fa41ba5e1310fab7';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ee0f2881: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ef726b1e [disable]
  UPDATE questions SET disabled = true WHERE id = 'ef726b1e-5245-4634-af36-a2377ae093fa' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '7ffc9b90e24e11ba8c1323c620054614';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ef726b1e: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- eff750f6 [disable]
  UPDATE questions SET disabled = true WHERE id = 'eff750f6-4520-4996-9a97-e84b379b85fa' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'ddd8433161e4ee18aa1df287a72efa97';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف eff750f6: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f158f12a [lam]
  UPDATE questions SET question_text = 'إذا كانتA(1,3), B(0,0), C(5,-1), D(6,2) رؤوس متوازي الأضلاعABCD :فإن نقطة تقاطع قطرية هي' WHERE id = 'f158f12a-a701-4bab-8185-0885693ccc7a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '74bb2272482a817dfd3d1d791d5c036b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f158f12a: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f1707701 [lam]
  UPDATE questions SET question_text = 'بدر : هلال' WHERE id = 'f1707701-9a40-43d6-969c-150692b3dc6a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '1d4c5cdb41904536703d7cfcd0b69384';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f1707701: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f1bf0f0b [lam]
  UPDATE questions SET choices = '["رجل : ركبة", "شعر : رأس", "صلاة : عبادة", "كتاب : مكتبة"]'::jsonb WHERE id = 'f1bf0f0b-c9d6-457f-b875-e8ddb29f4900' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '3392e11f8dc1a0648d6a9db6ceeb031f';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f1bf0f0b: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f3bf973f [lam, disable]
  UPDATE questions SET question_text = 'إخوان الشر هم ُ           689                                 إذا بكى المهزوم أفقد المنتصر لذة الإنتصار شخصا فشك فيه ،فإذا شككت فيه فلا إذا استخدمت                        من ينتصر على غيره فهو قوي ومن ينتصر على نفسه فهو', disabled = true WHERE id = 'f3bf973f-6710-4069-a614-c0eebd81ab8a' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '553a39102a5596c71f17aad8e1925c74';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f3bf973f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f482ead5 [lam]
  UPDATE questions SET question_text = 'له في القلب ثلاث حجرات؟' WHERE id = 'f482ead5-7e31-4d90-b49d-309b30fcc475' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'e1cad9fbe73073bdbb1156e909ef0568';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f482ead5: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f4bc1fcc [lam]
  UPDATE questions SET question_text = 'احتكار : غلاء' WHERE id = 'f4bc1fcc-157a-4693-856b-ed3bfc9a89d6' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f29ca050d83d12d7ad04396407ae7580';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f4bc1fcc: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f8d07fd2 [lam]
  UPDATE questions SET choices = '["صلاة : سلام", "دائرة : مربع", "حديقة : زهور", "عالم : مختبر"]'::jsonb, correct_choice = 'صلاة : سلام' WHERE id = 'f8d07fd2-e332-4fb8-bf94-eae16f948742' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'f758b9ad618a2f47f8ef1b188e2f4956';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f8d07fd2: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- f910ee70 [lam]
  UPDATE questions SET choices = '["ملاحظة : تحليل", "تحفيظ : تلقين", "أهداف : تحقيق", "استرجاع : تذكر"]'::jsonb, correct_choice = 'ملاحظة : تحليل' WHERE id = 'f910ee70-0c9c-4e9d-9602-af7a1362581b' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '00bc999023af52516deb089decf59698';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف f910ee70: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fac2daa9 [disable]
  UPDATE questions SET disabled = true WHERE id = 'fac2daa9-594b-4e81-a509-d68b2ca93618' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '5da953b133450efdad539f21bf1242b9';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fac2daa9: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fb07d076 [lam, disable]
  UPDATE questions SET question_text = 'لا يكفي أن تفعل  ..........بل أن  .......صنعه ..........الضخمة في المعاني', disabled = true WHERE id = 'fb07d076-447e-47fd-b315-b3e1623ca189' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '697ed020a7c3e6e57f409629468368c8';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fb07d076: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fc55f4d3 [lam]
  UPDATE questions SET choices = '["ملاحظة : تحليل", "تحفيظ : تلقين", "أهداف : تحقيق", "استرجاع : تذكر"]'::jsonb WHERE id = 'fc55f4d3-272c-4412-964c-5a0e8d91538c' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '7243345fee6a6b29945eaf97eb4e2b8a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fc55f4d3: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fe01ca07 [disable]
  UPDATE questions SET disabled = true WHERE id = 'fe01ca07-7425-4fff-9634-6f06554051cf' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '6c8ede11fb42df2f6fa185da65f700cf';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fe01ca07: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fe31681f [lam]
  UPDATE questions SET choices = '["تنساب جسيماتها بعضها فوق بعض", "يمكن ضغطها إلى حجم أصغر", "تأخذ شكل الوعاء الذي توضع فيه", "جسيماتها متلاصقة بقوة"]'::jsonb WHERE id = 'fe31681f-db51-497a-b5ac-035a5895d8ec' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '40992786fb883f6a96b2f6a5951ad4a4';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fe31681f: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fe5ddb16 [lam, rewrite]
  UPDATE questions SET question_text = 'العلاقة التي تنشأ عندما يستخدم أكثر من مخلوق حي واحد المصادر ذاتها في الوقت نفسه تسمى:', choices = '["تنافس", "افتراس", "تعايش", "تكافل"]'::jsonb, correct_choice = 'تنافس' WHERE id = 'fe5ddb16-2d48-44ab-a7c9-f64581255194' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = 'b84dc3e4099ef47aeed777c353904d41';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fe5ddb16: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- fee8031d [lam]
  UPDATE questions SET choices = '["اللزجة المختلطة", "الكيسية", "الاقترانية", "الدعامية"]'::jsonb WHERE id = 'fee8031d-c467-4ff1-98f5-6ca907e2fcd9' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '0e03441cce52948ed00acd4ce8322105';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف fee8031d: % صف (تغيّر منذ اللقطة؟)', n; END IF;
  -- ff49d806 [disable]
  UPDATE questions SET disabled = true WHERE id = 'ff49d806-f15a-465c-8b98-21ac7f8c3140' AND md5(coalesce(question_text,'') || '|' || coalesce(choices::text,'') || '|' || coalesce(explanation,'')) = '1975295b1fbd32802ccb607d41f145bb';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'الصف ff49d806: % صف (تغيّر منذ اللقطة؟)', n; END IF;
END
$cl$;

DO $chk$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM questions WHERE disabled AND id IN ('00cbb85c-895f-44c8-a216-c42f4a9b48e4','01e26259-7045-416c-8653-ca12f0f6ac34','0334f367-f161-413e-94c6-e607549c185f','1bb5a375-4b80-447a-a4bb-228ace233540','2dc736d0-bbac-46d4-b654-d87fb4ed6cd6','2e2d9196-a7e8-4a5e-bdf8-656a40d11e8a','348bca44-786c-47c3-beef-d6b6c6a56a4b','39bdecf8-c459-4ac1-9309-c0b5e86a459d','3ae5b04b-44dc-45a9-b66a-7af59cf7c8fb','3e3485f6-81be-4713-8d57-da2584ebf555','46d97811-e2d9-4ca8-bde6-990eefa91d92','499e1204-a6c1-4fdb-b93b-88b7bbd8279e','4c68f043-bb52-4120-907e-61d7aad363b2','50392a58-8d7c-4500-97a2-6a0a119b7859','506ccc8d-da5d-4f4b-9d24-4993e592a9e4','516eac91-f234-40d5-ae2d-198b801aa8ad','52855cc8-c461-42f4-9b46-26e3161d7dfd','5937bb9f-203e-466a-86bd-7d0272a86e0a','6548fed8-689a-45ea-9262-017b050f31a5','73765fd8-caca-48d2-bdf7-7d6ece6a1932','7a95daeb-c8a7-4ba1-a7df-63cac82bc51d','7afc4e85-16bb-4dc9-bcea-3f1046056c30','7dbfa44f-baf2-4df6-a6f5-1160a392365d','7e512b89-1184-4aaf-a438-81207e8a6960','8c2f9926-2cd2-455c-b79d-ad9150fedf32','9dbb0180-8c57-45d5-af75-4210f4c6095a','9e2036d9-06e2-4730-923d-a1b7840b76dc','a4f6a1f8-046f-49dc-8e9f-c5bf6859a9bf','ac420461-0249-461f-a636-7303b2b78773','b3e0f697-d7f7-4d2f-8eb8-b357d2a71a16','be73373b-2d6b-47fe-b451-eb7ec1bfd417','c4eb9c2b-3097-4b91-b9e2-cd1bfc2cd5a2','d6b460be-3896-400b-8660-8f0a6b06563c','f3bf973f-6710-4069-a614-c0eebd81ab8a','fe01ca07-7425-4fff-9634-6f06554051cf','080ad237-2559-4e0d-887f-7cc03fbb7b90','098fc826-8d1c-4576-87cf-26b7a27ecbc4','0c36b29e-b69d-499c-96ce-94f03234e07d','1a96f4c9-7d00-4448-bd82-74b8bb0cb9d9','2157b91b-8601-4c69-b49b-1f7cd8265960','2cd9bb85-50c6-439b-8ea8-088e08ae2c65','3d1cfa61-0a2b-456f-b83d-fc5a544258c5','512742bf-f362-4d43-8fa9-158325afe1d3','53eb972f-cd42-4b48-9073-342e7fe3f1b3','55960854-8c7c-4a60-9963-b5fb2b95e0f3','61e119b6-bc60-401f-9664-06aed6d34958','735e9170-bfff-41ae-906d-fe62e96319fc','7e79ea45-f024-4cc1-9e72-561b0a99e8b8','81a81efb-c94a-4abf-94b3-7948bd128a85','85a6f378-c6e3-4b88-8399-50026ba62741','85aae531-c13d-46bf-bee3-42f221545e42','a0f9cb09-64fd-4c36-af08-979670fb764e','a32af796-1864-451b-bd85-65dfe907a7d1','a492132e-1842-4e29-a99b-bfa6ab96591d','a78f5f6b-56f4-4807-8195-4f6a2f276fc4','b46c1e21-0609-4547-b8a7-1a37b0c87bee','ba62c610-c3f1-47c7-8782-2f3214b585bf','ce2f38a3-56c0-40f6-9f5e-e06f6cdef18c','d0d31f4b-bf65-46f2-9df3-adf844df7424','d62f0ab8-f20d-4931-b729-23e651cfbc66','d8c70202-944c-40f3-a221-26bbd4eeeb1c','db0423b2-4e62-4f5c-abd1-a375a6cf5a8e','ec8f180a-e1c3-4883-a40c-e5c03392cf6c','ee0f2881-4be2-4873-8d82-660163d591ad','ef726b1e-5245-4634-af36-a2377ae093fa','eff750f6-4520-4996-9a97-e84b379b85fa','fac2daa9-594b-4e81-a509-d68b2ca93618','fb07d076-447e-47fd-b315-b3e1623ca189','ff49d806-f15a-465c-8b98-21ac7f8c3140');
  IF n <> 69 THEN RAISE EXCEPTION 'التعطيل: % بدل 69', n; END IF;
  SELECT COUNT(*) INTO n FROM questions WHERE created_at::date IN ('2026-02-15','2026-04-03')
    AND (coalesce(question_text,'') || ' ' || coalesce(choices::text,'') || ' ' || coalesce(explanation,'')) ~ '(إال|تفاعالت|الخاليا|الموالرية|الكحوالت|المجاالت|بمتالزمة|التالصق|االنصهار|االتزان|خيالء|مواصالت|إقالع|استهالل|مالمح|العالقة)';
  IF n <> 0 THEN RAISE EXCEPTION 'بقيت كلمات لام ألف مقلوبة في % صف', n; END IF;
  RAISE NOTICE 'تم: 213 صفاً عُدّل، منها 69 عُطّل — سليم';
END
$chk$;

COMMIT;
