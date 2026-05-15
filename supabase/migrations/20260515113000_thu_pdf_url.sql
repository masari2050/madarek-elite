UPDATE leak_groups
SET pdf_url = 'https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/leaks-pdfs/tahsili-thu-may14.pdf',
    pdf_uploaded_at = NOW()
WHERE leak_date = '2026-05-14' AND title LIKE 'تسريبات%الخميس%';

SELECT title, pdf_url, pdf_downloads FROM leak_groups WHERE leak_date='2026-05-14';
