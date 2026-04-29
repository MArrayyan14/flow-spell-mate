CREATE TABLE public.units (
  id integer PRIMARY KEY,
  topic text NOT NULL,
  cefr_level text NOT NULL,
  description text NOT NULL,
  order_index integer NOT NULL UNIQUE,
  emoji text
);

CREATE TABLE public.concepts (
  concept_id text PRIMARY KEY,
  surface_form text NOT NULL,
  translation text NOT NULL,
  topic text NOT NULL,
  part_of_speech text NOT NULL,
  difficulty_level integer NOT NULL,
  frequency text NOT NULL,
  base_weight double precision NOT NULL,
  skill_affinity text[],
  unit_id integer REFERENCES public.units(id) ON DELETE SET NULL,
  mnemonic text,
  gender text,
  emoji text
);

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY,
  display_name text,
  xp_total integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  last_streak_date date,
  hearts integer NOT NULL DEFAULT 5,
  gems integer NOT NULL DEFAULT 0,
  league text NOT NULL DEFAULT 'Bronze',
  weekly_xp integer NOT NULL DEFAULT 0,
  last_practiced timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept_id text NOT NULL REFERENCES public.concepts(concept_id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  incorrect integer NOT NULL DEFAULT 0,
  last_practiced timestamptz,
  half_life_est double precision NOT NULL DEFAULT 1.0,
  recall_prob double precision NOT NULL DEFAULT 1.0,
  adaptive_weight double precision NOT NULL DEFAULT 1.0,
  UNIQUE(user_id, concept_id)
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unit_id integer REFERENCES public.units(id) ON DELETE SET NULL,
  session_type text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_concepts_unit_id ON public.concepts(unit_id);
CREATE INDEX idx_concepts_topic ON public.concepts(topic);
CREATE INDEX idx_user_memory_user_id ON public.user_memory(user_id);
CREATE INDEX idx_user_memory_concept_id ON public.user_memory(concept_id);
CREATE INDEX idx_sessions_user_id_created_at ON public.sessions(user_id, created_at DESC);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learning units are viewable by everyone"
ON public.units
FOR SELECT
USING (true);

CREATE POLICY "Concepts are viewable by everyone"
ON public.concepts
FOR SELECT
USING (true);

CREATE POLICY "Signed-in users can seed concepts only when empty"
ON public.concepts
FOR INSERT
TO authenticated
WITH CHECK ((SELECT count(*) FROM public.concepts) = 0);

CREATE POLICY "Learners can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Learners can create their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Learners can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Learners can view their own memory"
ON public.user_memory
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Learners can create their own memory"
ON public.user_memory
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners can update their own memory"
ON public.user_memory
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners can view their own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Learners can create their own sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners can update their own sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

INSERT INTO public.units (id, topic, cefr_level, description, order_index, emoji) VALUES
  (1, 'Core', 'A1', 'Pronouns, verbs, conjunctions', 1, '🔤'),
  (2, 'Greetings', 'A1', 'Basic social phrases', 2, '👋'),
  (3, 'Numbers', 'A1', 'Cardinal and ordinal numbers', 3, '🔢'),
  (4, 'Food', 'A1', 'Common foods, drinks, eating verbs', 4, '🍎'),
  (5, 'Family', 'A1', 'Family relationships', 5, '👨‍👩‍👧'),
  (6, 'Time', 'A2', 'Days, hours, expressions', 6, '🕐'),
  (7, 'Travel', 'A2', 'Transport, directions, places', 7, '✈️'),
  (8, 'Shopping', 'A2', 'Prices, transactions, shops', 8, '🛍️'),
  (9, 'Work', 'B1', 'Office, jobs, professional', 9, '💼'),
  (10, 'Emergency', 'A2', 'Safety, medical, urgent phrases', 10, '🚨')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.concepts (concept_id, surface_form, translation, unit_id, difficulty_level, base_weight, frequency, topic, part_of_speech, emoji, mnemonic) VALUES
  ('es:hola', 'hola', 'hello', 2, 1, 3.8, 'high', 'Greetings', 'interjection', '👋', NULL),
  ('es:agua', 'agua', 'water', 4, 1, 3.8, 'high', 'Food', 'noun', '💧', NULL),
  ('es:manzana', 'manzana', 'apple', 4, 1, 3.4, 'high', 'Food', 'noun', '🍎', 'Sounds like MAN-sana — imagine a man eating an apple'),
  ('es:gracias', 'gracias', 'thank you', 2, 1, 3.8, 'high', 'Greetings', 'interjection', '🙏', NULL),
  ('es:uno', 'uno', 'one', 3, 1, 3.8, 'high', 'Numbers', 'numeral', '1️⃣', NULL),
  ('es:madre', 'madre', 'mother', 5, 1, 3.6, 'high', 'Family', 'noun', '👩', NULL),
  ('es:hoy', 'hoy', 'today', 6, 1, 3.8, 'high', 'Time', 'adverb', '📅', NULL),
  ('es:ayuda', 'ayuda', 'help', 10, 1, 3.8, 'high', 'Emergency', 'noun', '🆘', NULL)
ON CONFLICT (concept_id) DO NOTHING;