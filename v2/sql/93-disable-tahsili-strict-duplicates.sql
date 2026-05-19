-- 93: Disable 17 strict-duplicate Tahsili questions (text + choices + correct_index match)
-- Audit 2026-05-19 found 2,281 active tahsili questions including 17 exact-duplicate pairs.
-- Policy: keep the question marked is_top_repeated=true OR with leak_group_id (Period 1).
-- Disable the other copy. correct_index match guarantees no information lost.

BEGIN;

UPDATE questions SET disabled = true WHERE id IN (
  'a1725f8d-a08a-4fc6-af57-55dd145a33ac',  -- "شخص فصيلة دمه AB" (kept: 014eb84c, top=T)
  'e4f458f8-406d-4e88-be1a-d042b5baf9f3',  -- "المجال المغناطيسي المتغير" (kept: 17c368a7, top=T)
  '57466734-2ce8-4fbe-92ad-c118b87eef8e',  -- "الكتلة لا تفنى" (kept: 1d85ce21, leak=Period 1)
  '3ba3a2ec-0665-44d8-9abf-80fdc9667a4a',  -- "جسم مسار دائري عكس عقارب" (kept: 24dfa655, leak)
  'cae030f1-1780-424d-8f43-977c4f750c84',  -- "اسم القُبَّرة العلمي" (kept: 27c83638, leak)
  'b6f22134-119e-4ee8-a00a-93892a5738a2',  -- "متأثّر بالجنس" (kept: 2be064c6, leak)
  '3c4d06b2-12c6-4964-8e6a-4e53f05d32c6',  -- "معادلة دي بروي" (kept: 2c25d710, leak)
  'cb243a4a-3a29-4861-9961-75c0f0116ceb',  -- "المفاصل الثابتة" (kept: 35bd6a41, top=T)
  'c4ddc2d9-bdf9-45b7-817a-d1c98c95b80b',  -- "خطّا التقارب القطع الزائد" (kept: 46bfbe47, leak)
  'ec8e0465-d36b-448c-9406-2c8c0be5a6cd',  -- "المكوّن الأساسي للشعر والأظافر" (kept: 4cb0d4cf, leak)
  '7078c651-3c5f-4b0d-b47d-5dfca500f119',  -- "قطار 30 m/s تباطؤ" (kept: 4fdaa4e9, leak)
  '61066888-a2cb-4424-a4fb-0cbe2fb333f3',  -- "الجزيئات القطبية" (kept: 809f900c, top=T)
  '79a2b850-f43f-4939-9495-f78b2b9e0c30',  -- "مرض النوم الأفريقي" (kept: b0a309cf, leak)
  '7ab554b5-0028-4e5b-8ad3-4a11b374b01c',  -- "النشادر في الماء" (kept: ad8958fe, top=T)
  '8a94237c-bdc9-42a7-9e39-0f2b28bf6e24',  -- "كهرباء → حركية دورانية" (kept: bfb46abf, leak)
  '90086b06-bfbc-4eec-a8af-bf61886e6461',  -- "الموجة الموقوفة" (kept: c0ec0164, top=T)
  '9315ef6e-3f28-4cc9-b40b-898facb4be4c'   -- "الخلية الجلفانية" (kept: ba84a421, top=T)
);

COMMIT;
