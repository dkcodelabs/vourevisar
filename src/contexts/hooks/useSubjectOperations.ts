
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { toast } from 'sonner';

export const useSubjectOperations = (
  user: any,
  loadSubjects: () => Promise<void>
) => {
  const addSubject = async (subjectData: Omit<Subject, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: subjectData.name,
          status: subjectData.status,
          priority: subjectData.priority || 0,
          color: subjectData.color
        })
        .select()
        .single();

      if (error) throw error;

      await loadSubjects();
      // Removido toast para não roubar foco
    } catch (error: any) {
      console.error('Error adding subject:', error);
      // Removido toast, deixar o componente lidar com erros
      throw error;
    }
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: updates.name,
          status: updates.status,
          priority: updates.priority,
          color: updates.color
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSubjects();
      // Removido toast para não roubar foco
    } catch (error: any) {
      console.error('Error updating subject:', error);
      throw error;
    }
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSubjects();
      // Removido toast para não roubar foco
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  };

  return {
    addSubject,
    updateSubject,
    deleteSubject,
    createSubject: addSubject
  };
};
