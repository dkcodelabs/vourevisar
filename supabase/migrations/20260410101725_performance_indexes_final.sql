-- Adding missing indexes to ensure peak performance for RLS policies

-- topic_review_history usually grows fast, needs user_id index
CREATE INDEX IF NOT EXISTS idx_topic_review_history_user_id ON public.topic_review_history (user_id);

-- user_settings is small but we use it often
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);

-- user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions (user_id);

-- subjects needs to be fast on user_id for many joins
CREATE INDEX IF NOT EXISTS idx_subjects_user_id_id ON public.subjects (user_id, id);

-- topics needs to be fast on subject_id and user participation
CREATE INDEX IF NOT EXISTS idx_topics_subject_id_id ON public.topics (subject_id, id);
;
