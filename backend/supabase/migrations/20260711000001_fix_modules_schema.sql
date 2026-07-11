-- drop modules, cascade removes FK from submissions
DROP TABLE IF EXISTS public.modules CASCADE;

-- create new modules table and RLS
CREATE TABLE public.modules (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  content_markdown text,
  level skill_level DEFAULT 'BEGINNER',
  track specialty_track DEFAULT 'PORTRAIT',
  is_free boolean DEFAULT true,
  is_published boolean DEFAULT false,
  cover_photo_key text,
  example_photo_keys jsonb DEFAULT '[]'::jsonb,
  assignment_prompt text,
  estimated_minutes integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY modules_select_all
  ON public.modules
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- clear old module references
UPDATE public.submissions SET module_id = NULL;

-- fix submissions module_id type
ALTER TABLE public.submissions
  ALTER COLUMN module_id TYPE integer USING NULL;

-- re-add FK
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL;

-- add index on module_id on submission TABLE
CREATE INDEX idx_submissions_module_id ON public.submissions(module_id);
