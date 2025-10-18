-- Fix security issue: Add missing UPDATE and DELETE policies for question_attempts table
-- This allows users to manage their own quiz attempts while maintaining security

-- Allow users to update their own attempts (e.g., for adding notes/flags)
CREATE POLICY "Users can update own attempts"
ON question_attempts FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own attempts
CREATE POLICY "Users can delete own attempts"  
ON question_attempts FOR DELETE
USING (auth.uid() = user_id);

-- Add database constraints for input validation as backup security layer
-- These prevent data integrity issues at the database level
-- Constraints are set to accommodate existing data

ALTER TABLE subjects 
ADD CONSTRAINT subject_name_length 
CHECK (char_length(name) <= 200 AND char_length(name) > 0);

ALTER TABLE topics 
ADD CONSTRAINT topic_name_length 
CHECK (char_length(name) <= 500 AND char_length(name) > 0);

ALTER TABLE general_notes
ADD CONSTRAINT note_content_length
CHECK (char_length(content) <= 100000);

ALTER TABLE general_reminders
ADD CONSTRAINT reminder_text_length
CHECK (char_length(text) <= 1000 AND char_length(text) > 0);