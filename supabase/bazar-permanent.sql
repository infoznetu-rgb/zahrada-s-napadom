-- Run as an authorized administrator in the website project bkyappgttwjxakkwycub.
-- Keep moderation and public read policies unchanged. Closed/rejected/pending ads stay hidden.
BEGIN;
UPDATE public.zahrada_bazar_ads
SET expires_at = 'infinity'::timestamptz
WHERE status = 'published'
  AND expires_at IS DISTINCT FROM 'infinity'::timestamptz;
SELECT status, count(*) AS total,
       count(*) FILTER (WHERE expires_at = 'infinity'::timestamptz) AS permanent
FROM public.zahrada_bazar_ads GROUP BY status;
COMMIT;
