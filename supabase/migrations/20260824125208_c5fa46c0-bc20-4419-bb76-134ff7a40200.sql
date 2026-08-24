-- The freshness columns were backfilled with now(), which made every stored
-- job look freshly verified. Truth: a job is only verified when a crawl saw
-- it, i.e. last_seen_at. Never let last_verified_at run ahead of last_seen_at.
UPDATE public.jobs
   SET last_verified_at = last_seen_at
 WHERE last_verified_at > last_seen_at;

-- Verification count should reflect real crawls, not the backfill.
UPDATE public.jobs
   SET verification_count = GREATEST(verification_count, 1)
 WHERE verification_count = 0;