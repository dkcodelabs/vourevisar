
import React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useSubjectsAndTopics } from '@/hooks/useSubjectsAndTopics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const subjectOptions = subjects.map(subject => ({
    value: subject.id,
    label: subject.name
  }));

  const topicOptions = topics.map(topic => ({
    value: topic.id,
    label: topic.name
  }));

  const handleSubjectChange = (subjectId: string) => {
    const selectedSubject = subjects.find(s => s.id === subjectId);
    if (selectedSubject) {
      onSubjectChange(selectedSubject.name);
      onTopicChange('');
      fetchTopicsBySubject(subjectId);
    }
  };

  const handleCustomSubject = async (subjectName: string) => {
    try {
      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert([{ name: subjectName, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;

      onSubjectChange(subjectName);
      onTopicChange('');
      
      toast.success(`Matéria "${subjectName}" criada com sucesso!`);
      window.location.reload();
    } catch (error) {
      console.error('Erro ao criar matéria:', error);
      toast.error('Erro ao criar nova matéria');
    }
  };

  const handleTopicChange = (topicId: string) => {
    const selectedTopic = topics.find(t => t.id === topicId);
    if (selectedTopic) {
      onTopicChange(selectedTopic.name);
    }
  };

  const handleCustomTopic = async (topicName: string) => {
    if (!subject) {
      toast.error('Selecione uma matéria primeiro');
      return;
    }

    try {
      const selectedSubject = subjects.find(s => s.name === subject);
      if (!selectedSubject) return;

      const { data: newTopic, error } = await supabase
        .from('topics')
        .insert([{ 
          name: topicName, 
          subject_id: selectedSubject.id,
          user_id: user!.id 
        }])
        .select()
        .single();

      if (error) throw error;

      onTopicChange(topicName);
      
      toast.success(`Tópico "${topicName}" criado com sucesso!`);
      fetchTopicsBySubject(selectedSubject.id);
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      toast.error('Erro ao criar novo tópico');
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Matéria *
        </label>
        {isLoading ? (
          <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        ) : (
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
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Tópico *
        </label>
        <Combobox
          options={topicOptions}
          value={topics.find(t => t.name === topic)?.id || ''}
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
