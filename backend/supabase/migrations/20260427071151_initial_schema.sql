-- 1. ENUMS
-- ============================================

CREATE TYPE skill_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE specialty_track AS ENUM ('PORTRAIT', 'STREET', 'TRAVEL', 'PRODUCT');
CREATE TYPE submission_status AS ENUM ('UPLOADED', 'GRADING', 'AWAITING_HUNG', 'COMPLETED', 'FAILED');
CREATE TYPE review_type AS ENUM ('AI', 'HUNG');
CREATE TYPE transaction_type AS ENUM ('PURCHASE', 'SPEND', 'REFUND', 'STARTER_BONUS');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'EXPIRED', 'CANCELLED');

-- 2. TABLES
-- ============================================

-- profiles (extends auth.users), create new profile on auth.users insertion
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  credits_balance integer DEFAULT 0,
  skill_level skill_level DEFAULT 'BEGINNER',
  phone_verified boolean DEFAULT false,
  locale text DEFAULT 'vi',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); -- disallow changing profile_id, always == auth.id

-- modules
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  content_url text,
  content_markdown text,
  level skill_level DEFAULT 'BEGINNER',
  track specialty_track DEFAULT 'PORTRAIT',
  sequence_order integer DEFAULT 0,
  is_free boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY modules_select_all
  ON public.modules
  FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY modules_admin_write
  ON public.modules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  original_photo_url text,
  processed_photo_url text,
  status submission_status DEFAULT 'UPLOADED',
  review_type review_type DEFAULT 'AI',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_select_own
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY submissions_insert_own
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY submissions_admin_all
  ON public.submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  overall_score integer CHECK (overall_score BETWEEN 1 AND 100),
  category_scores jsonb,
  ai_feedback text,
  hung_comments text,
  annotation_data jsonb,
  audio_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_own
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM public.submissions WHERE id = submission_id));

-- credit_history
CREATE TABLE public.credit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type transaction_type NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_history_select_own
  ON public.credit_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  provider text NOT NULL,
  status payment_status DEFAULT 'PENDING',
  external_ref text UNIQUE NOT NULL,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(id);
CREATE INDEX idx_modules_slug ON public.modules(slug);
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_payments_external_ref ON public.payments(external_ref);
CREATE INDEX idx_credit_history_user_id ON public.credit_history(user_id);

-- 4. FUNCTIONS
-- ============================================

-- Auto-create profile on new auth.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit spend
CREATE OR REPLACE FUNCTION public.spend_credits(
  user_id uuid,
  amount integer
)
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance - amount,
      updated_at = now()
  WHERE id = user_id
    AND credits_balance >= amount
  RETURNING credits_balance INTO new_balance;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGERS
-- ============================================

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 6. SEED DATA
-- ============================================

INSERT INTO public.modules (slug, title, description, level, track, sequence_order)
VALUES
  ('composition-basics', 'Cơ bản về Bố cục', 'Học rule of thirds, leading lines, và framing.', 'BEGINNER', 'PORTRAIT', 1),
  ('lighting-101', 'Ánh sáng Nhiếp ảnh 101', 'Natural light, golden hour, và shadow control.', 'BEGINNER', 'PORTRAIT', 2),
  ('portrait-posing', 'Tạo dáng Chân dung', 'Hướng dẫn tạo dáng cho mẫu chân dung.', 'INTERMEDIATE', 'PORTRAIT', 3);
