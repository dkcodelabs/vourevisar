
import React, { useEffect } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useSubjectsAndTopics } from '@/hooks/useSubjectsAndTopics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subjectNameSchema, topicNameSchema } from '@/lib/validation';

interface SubjectTopicSelectorProps {
  subject: string;
  topic: string;
  onSubjectChange: (subject: string) => void;
  onTopicChange: (topic: string) => void;
}

const SubjectTopicSelector: React.FC<SubjectTopicSelectorProps> = ({
  subject,
  topic,
  onSubjectChange,
  onTopicChange
}) => {
  const { user } = useAuth();
  const { subjects, topics, isLoading, fetchTopicsBySubject } = useSubjectsAndTopics();

  // Carregar tópicos automaticamente quando subject for preenchido
  useEffect(() => {
    const loadTopicsForSubject = async () => {
      if (subject && subjects.length > 0) {
        const selectedSubject = subjects.find(s => s.name === subject);
        if (selectedSubject) {
          await fetchTopicsBySubject(selectedSubject.id);
        }
      }
    };

    loadTopicsForSubject();
  }, [subject, subjects, fetchTopicsBySubject]);

  const subjectOptions = subjects.map(subject => ({
    value: subject.id,
    label: subject.name
  }));

  const topicOptions = subject ? [
    { value: 'Geral', label: 'Geral' },
    ...topics.map(topic => ({
      value: topic.id,
      label: topic.name
    }))
  ] : [];

  const handleSubjectChange = async (subjectId: string) => {
    const selectedSubject = subjects.find(s => s.id === subjectId);
    if (selectedSubject) {
      onSubjectChange(selectedSubject.name);
      onTopicChange('');
      await fetchTopicsBySubject(subjectId);
    }
  };

  const handleCustomSubject = async (subjectName: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      // Validate input
      const validatedName = subjectNameSchema.parse(subjectName);

      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert([{ name: validatedName, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      onSubjectChange(subjectName);
      onTopicChange('');
      
      toast.success(`Matéria "${subjectName}" criada com sucesso!`);
      
      // Refresh subjects list by refetching data
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1000);
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        toast.error(error.errors[0]?.message || 'Erro ao validar nome da matéria');
      } else {
        toast.error('Erro ao criar nova matéria');
      }
    }
  };

  const handleTopicChange = (topicId: string) => {
    if (topicId === 'Geral') {
      onTopicChange('Geral');
    } else {
      const selectedTopic = topics.find(t => t.id === topicId);
      if (selectedTopic) {
        onTopicChange(selectedTopic.name);
      }
    }
  };

  const handleCustomTopic = async (topicName: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!subject) {
      toast.error('Selecione uma matéria primeiro');
      return;
    }

    try {
      // Validate input
      const validatedName = topicNameSchema.parse(topicName);

      const selectedSubject = subjects.find(s => s.name === subject);
      if (!selectedSubject) {
        toast.error('Matéria não encontrada');
        return;
      }

      const { data: newTopic, error } = await supabase
        .from('topics')
        .insert([{ 
          name: validatedName, 
          subject_id: selectedSubject.id,
          user_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;

      onTopicChange(topicName);
      
      toast.success(`Tópico "${topicName}" criado com sucesso!`);
      await fetchTopicsBySubject(selectedSubject.id);
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        toast.error(error.errors[0]?.message || 'Erro ao validar nome do tópico');
      } else {
        toast.error('Erro ao criar novo tópico');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Matéria *</label>
          <div className="h-10 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tópico (opcional)</label>
          <div className="h-10 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Matéria *
        </label>
        <Combobox
          options={subjectOptions}
          value={subjects.find(s => s.name === subject)?.id || ''}
          onValueChange={handleSubjectChange}
          placeholder="Digite ou selecione uma matéria..."
          searchPlaceholder="Pesquisar matérias..."
          emptyText="Nenhuma matéria encontrada."
          allowCustomInput={true}
          onCustomInput={handleCustomSubject}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Tópico (opcional)
        </label>
        <Combobox
          options={topicOptions}
          value={topic === 'Geral' ? 'Geral' : topics.find(t => t.name === topic)?.id || ''}
          onValueChange={handleTopicChange}
          placeholder="Digite ou selecione um tópico..."
          searchPlaceholder="Pesquisar tópicos..."
          emptyText={subject ? "Nenhum tópico encontrado para esta matéria." : "Selecione uma matéria primeiro."}
          disabled={!subject}
          allowCustomInput={!!subject}
          onCustomInput={handleCustomTopic}
        />
      </div>
    </>
  );
};

export default SubjectTopicSelector;
