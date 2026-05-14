UPDATE leak_groups
SET pdf_url = 'https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/leaks-pdfs/tahsili-wed-may13.pdf',
    pdf_uploaded_at = NOW()
WHERE id = 'cfaf82ac-dc99-43ac-8d00-d44133802245';

SELECT title, pdf_url, pdf_downloads, pdf_uploaded_at FROM leak_groups WHERE id = 'cfaf82ac-dc99-43ac-8d00-d44133802245';
