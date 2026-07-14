-- Tracks the user's current module in the linear course progression.
-- Modules with id < current_module are considered completed.
-- Module with id == current_module is the active/available one.
-- Modules with id > current_module are locked.
ALTER TABLE public.profiles
  ADD COLUMN current_module integer DEFAULT 1;

-- Backfill existing profiles to start at module 1.
UPDATE public.profiles
  SET current_module = 1
  WHERE current_module IS NULL;

-- Ensure non-null going forward.
ALTER TABLE public.profiles
  ALTER COLUMN current_module SET NOT NULL;
