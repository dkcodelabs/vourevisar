ALTER TABLE pending_merge_suggestions 
ADD CONSTRAINT pending_merge_suggestions_unique_key 
UNIQUE (user_id, cycle_id, suggestion_type, original_names);;
