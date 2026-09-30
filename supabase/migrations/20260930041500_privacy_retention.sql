DO $$
DECLARE
  existing_job bigint;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('zahrada-site-events-retention', 'zahrada-community-submissions-retention')
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;

  PERFORM cron.schedule(
    'zahrada-privacy-retention',
    '15 4 * * *',
    $job$
      DELETE FROM public.site_events
      WHERE created_at < now() - interval '13 months';

      DELETE FROM public.zahrada_community_submissions
      WHERE status IN ('pending', 'rejected')
        AND created_at < now() - interval '180 days';
    $job$
  );
END $$;
