
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { toast } from '@/lib/toast';

export const useSubjectOperations = (
  user: any,
  loadSubjects: () => Promise<void>
) => {
  const addSubject = async (subjectData: Omit<Subject, 'id'>) => {
    if (!user) return;

    console.log('🔵 addSubject iniciado:', { subjectData, userId: user.id });

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

      if (error) {
        console.error('❌ Erro no insert:', error);
        throw error;
      }

      console.log('✅ Matéria inserida com sucesso:', data);

      await loadSubjects();
      console.log('✅ loadSubjects executado');

      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('subjectUpdated', {
        detail: { action: 'add', subjectId: data.id }
      }));

      // Removido toast para não roubar foco
    } catch (error: any) {
      console.error('❌ Error adding subject:', error);
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

      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('subjectUpdated', {
        detail: { action: 'update', subjectId: id }
      }));

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

      // Disparar evento para sincronizar outras páginas
      window.dispatchEvent(new CustomEvent('subjectUpdated', {
        detail: { action: 'delete', subjectId: id }
      }));

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
