-- Migration: admin_submit_review RPC
-- Atomically inserts a review and flips submission to COMPLETED.
-- Only callable by service_role (backend admin routes).

CREATE OR REPLACE FUNCTION public.admin_submit_review(
  p_submission_id   uuid,
  p_overall_score   integer,
  p_category_scores jsonb,
  p_hung_comments   text
)
RETURNS void AS $$
DECLARE
  v_status submission_status;
BEGIN
  -- Lock submission row to prevent concurrent grading
  SELECT status INTO v_status
    FROM public.submissions
   WHERE id = p_submission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'AWAITING_HUNG' THEN
    RAISE EXCEPTION 'Submission not in AWAITING_HUNG status: %', v_status
      USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
  END IF;

  -- Insert the review
  INSERT INTO public.reviews (submission_id, overall_score, category_scores, hung_comments)
  VALUES (p_submission_id, p_overall_score, p_category_scores, p_hung_comments);

  -- Flip submission to COMPLETED
  UPDATE public.submissions
     SET status = 'COMPLETED'
   WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock down: only service_role (bypasses REVOKE) may call.
REVOKE EXECUTE ON FUNCTION public.admin_submit_review FROM PUBLIC, anon, authenticated;
