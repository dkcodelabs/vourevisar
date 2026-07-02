
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';

export const useSubjectOperations = (
  user: { id: string } | null,
  loadSubjects: () => Promise<void>
) => {
  const addSubject = async (subjectData: Omit<Subject, 'id'> & { edital_id?: string }) => {
    if (!user) return;

    console.log('🔵 addSubject iniciado:', { subjectData, userId: user.id });

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: subjectData.name,
          status: subjectData.status || 'Não Iniciada',
          priority: subjectData.priority || 0,
          color: subjectData.color,
          edital_id: subjectData.edital_id // Capturar edital_id se fornecido
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
    } catch (err: unknown) {
      errorService.report(err, { module: 'subjects', action: 'add', userMessage: 'Erro ao adicionar matéria.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao adicionar matéria', 'SUBJ-01');
      throw err;
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
          color: updates.color,
          edital_id: (updates as unknown).edital_id // Manter o cast temporário até tipar o Partial<Subject> melhor se necessário
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
    } catch (err: unknown) {
      errorService.report(err, { module: 'subjects', action: 'update', userMessage: 'Erro ao atualizar matéria.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao atualizar matéria', 'SUBJ-02');
      throw err;
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

      // Remover o ID desta matéria de todos os editais que a referenciam
      const { data: editaisWithSubject } = await (supabase as unknown)
        .from('user_editais')
        .select('id, subject_ids')
        .contains('subject_ids', [id]);

      if (editaisWithSubject) {
        for (const edital of (editaisWithSubject as { id: string; subject_ids: string[] }[])) {
          const remaining = (edital.subject_ids || []).filter((sid: string) => sid !== id);
          await (supabase as unknown)
            .from('user_editais')
            .update({
              subject_ids: remaining,
              // Se ficou sem matérias, tirar do ciclo ativo automaticamente
              ...(remaining.length === 0 ? { merged_into_cycle: false } : {})
            })
            .eq('id', edital.id);
        }
      }

      await loadSubjects();

      // Disparar evento para sincronizar outras páginas (inclui useEditalOrigins)
      window.dispatchEvent(new CustomEvent('subjectUpdated', {
        detail: { action: 'delete', subjectId: id }
      }));

      // Removido toast para não roubar foco
    } catch (err: unknown) {
      errorService.report(err, { module: 'subjects', action: 'delete', userMessage: 'Erro ao deletar matéria.' });
      toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao deletar matéria', 'SUBJ-03');
      throw err;
    }
  };

  return {
    addSubject,
    updateSubject,
    deleteSubject,
    createSubject: addSubject
  };
};
