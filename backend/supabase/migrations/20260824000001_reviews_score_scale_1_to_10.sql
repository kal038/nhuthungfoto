-- Migration: reviews score scale 1-10
-- Tighten reviews.overall_score CHECK from 1-100 to 1-10, matching the app's
-- integer 1-10 grading scale. category_scores values carry no DB constraint and
-- are validated by the app schema (gradingRequestSchema).

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
    FROM pg_constraint
   WHERE conrelid = 'public.reviews'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%overall_score%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reviews DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_overall_score_check
  CHECK (overall_score BETWEEN 1 AND 10);
