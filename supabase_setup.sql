-- Create user profiles table
create table public.users (
    id uuid references auth.users not null primary key,
    name text,
    email text,
    date_of_birth date,
    role text,
    educational_qualification text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on public.users for insert
  with check ( true ); -- Allow insert during signup, RLS will protect updates/selects

create policy "Users can update their own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Create user_progress table
create table public.user_progress (
    user_id uuid references auth.users not null primary key,
    hours_learned integer default 0,
    assessments_taken integer default 0,
    learning_paths_created integer default 0,
    quizzes_taken integer default 0,
    avg_accuracy integer default 0,
    learning_streak integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for user_progress
alter table public.user_progress enable row level security;

-- Create policies for user_progress
create policy "Users can view their own progress"
  on public.user_progress for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check ( true ); -- Allow insert, trigger/signup handles this

create policy "Users can update their own progress"
  on public.user_progress for update
  using ( auth.uid() = user_id );

-- Create learning_sessions table
create table if not exists public.learning_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    category text not null,
    topic text not null,
    hours_spent integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for learning_sessions
alter table public.learning_sessions enable row level security;

-- Create policies for learning_sessions
create policy "Users can view their own learning sessions"
  on public.learning_sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own learning sessions"
  on public.learning_sessions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own learning sessions"
  on public.learning_sessions for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own learning sessions"
  on public.learning_sessions for delete
  using ( auth.uid() = user_id );

-- Create assessment_results table
DROP TABLE IF EXISTS public.assessment_results CASCADE;

create table public.assessment_results (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    domain text not null,
    skill text not null,
    level text not null,
    score integer not null,
    total_questions integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for assessment_results
alter table public.assessment_results enable row level security;

-- Create policies for assessment_results
create policy "Users can view their own assessment results"
  on public.assessment_results for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own assessment results"
  on public.assessment_results for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own assessment results"
  on public.assessment_results for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own assessment results"
  on public.assessment_results for delete
  using ( auth.uid() = user_id );

-- Create learning_paths table
create table public.learning_paths (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    domain text not null,
    skill text not null,
    level text not null,
    weeks integer not null,
    status text not null default 'active',
    path_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for learning_paths
alter table public.learning_paths enable row level security;

-- Create policies for learning_paths
create policy "Users can view their own learning paths"
  on public.learning_paths for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own learning paths"
  on public.learning_paths for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own learning paths"
  on public.learning_paths for update
  using ( auth.uid() = user_id );

-- Create learning_path_assessments table
create table public.learning_path_assessments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    learning_path_id uuid references public.learning_paths(id) on delete cascade,
    week_number integer not null,
    topic text not null,
    score integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for learning_path_assessments
alter table public.learning_path_assessments enable row level security;

-- Create policies for learning_path_assessments
create policy "Users can view their own learning path assessments"
  on public.learning_path_assessments for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own learning path assessments"
  on public.learning_path_assessments for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own learning path assessments"
  on public.learning_path_assessments for update
  using ( auth.uid() = user_id );

-- Create weekly_assessment_results table for Adaptive Learning
create table if not exists public.weekly_assessment_results (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    learning_path_id uuid references public.learning_paths(id) on delete cascade,
    week_number integer not null,
    topic text,
    weekly_topics text[],
    score integer not null,
    total_questions integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for weekly_assessment_results
alter table public.weekly_assessment_results enable row level security;

-- Create policies for weekly_assessment_results
create policy "Users can view their own weekly assessment results"
  on public.weekly_assessment_results for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own weekly assessment results"
  on public.weekly_assessment_results for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own weekly assessment results"
  on public.weekly_assessment_results for update
  using ( auth.uid() = user_id );
-- Create learning_path_weeks table
create table public.learning_path_weeks (
    id uuid default gen_random_uuid() primary key,
    learning_path_id uuid references public.learning_paths(id) on delete cascade,
    week_number integer not null,
    title text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for learning_path_weeks
alter table public.learning_path_weeks enable row level security;

-- Create policies for learning_path_weeks
create policy "Users can view their own learning path weeks"
  on public.learning_path_weeks for select
  using ( auth.uid() in (select user_id from public.learning_paths where id = learning_path_id) );

create policy "Users can insert their own learning path weeks"
  on public.learning_path_weeks for insert
  with check ( auth.uid() in (select user_id from public.learning_paths where id = learning_path_id) );

-- Create learning_path_days table
create table public.learning_path_days (
    id uuid default gen_random_uuid() primary key,
    week_id uuid references public.learning_path_weeks(id) on delete cascade,
    day_number integer not null,
    topic text not null,
    explanation text,
    practice_exercise text,
    duration text,
    is_completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for learning_path_days
alter table public.learning_path_days enable row level security;

-- Create policies for learning_path_days
create policy "Users can view their own learning path days"
  on public.learning_path_days for select
  using ( auth.uid() in (select lp.user_id from public.learning_paths lp join public.learning_path_weeks lpw on lp.id = lpw.learning_path_id where lpw.id = week_id) );

create policy "Users can update their own learning path days"
  on public.learning_path_days for update
  using ( auth.uid() in (select lp.user_id from public.learning_paths lp join public.learning_path_weeks lpw on lp.id = lpw.learning_path_id where lpw.id = week_id) );

create policy "Users can insert their own learning path days"
  on public.learning_path_days for insert
  with check ( auth.uid() in (select lp.user_id from public.learning_paths lp join public.learning_path_weeks lpw on lp.id = lpw.learning_path_id where lpw.id = week_id) );

-- Create weekly_assessments table
create table public.weekly_assessments (
    id uuid default gen_random_uuid() primary key,
    learning_path_id uuid references public.learning_paths(id) on delete cascade,
    week_number integer not null,
    questions jsonb not null,
    score integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for weekly_assessments
alter table public.weekly_assessments enable row level security;

-- Create policies for weekly_assessments
create policy "Users can view their own weekly assessments"
  on public.weekly_assessments for select
  using ( auth.uid() in (select user_id from public.learning_paths where id = learning_path_id) );

create policy "Users can insert their own weekly assessments"
  on public.weekly_assessments for insert
  with check ( auth.uid() in (select user_id from public.learning_paths where id = learning_path_id) );

create policy "Users can update their own weekly assessments"
  on public.weekly_assessments for update
  using ( auth.uid() in (select user_id from public.learning_paths where id = learning_path_id) );
