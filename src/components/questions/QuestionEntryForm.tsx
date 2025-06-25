
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuestionEntryForm } from '@/hooks/useQuestionEntryForm';
import SubjectTopicSelector from './SubjectTopicSelector';
import BankSelector from './BankSelector';
import QuestionCountInputs from './QuestionCountInputs';
import SubmitButton from './SubmitButton';

interface QuestionEntryFormProps {
  onEntryAdded: () => void;
}

const QuestionEntryForm: React.FC<QuestionEntryFormProps> = ({ onEntryAdded }) => {
  const {
    formData,
    setFormData,
    isSubmitting,
    handleTotalQuestionsChange,
    handleCorrectQuestionsChange,
    handleSubmit
  } = useQuestionEntryForm(onEntryAdded);

  const handleSubjectChange = (subject: string) => {
    setFormData(prev => ({ ...prev, subject, topic: '' }));
  };

  const handleTopicChange = (topic: string) => {
    setFormData(prev => ({ ...prev, topic }));
  };

  const handleBankChange = (bank: string) => {
    setFormData(prev => ({ ...prev, bank }));
  };

  const isFormValid = formData.subject && formData.topic && formData.bank && formData.totalQuestions > 0;

  return (
    <Card className="bg-white/70 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle>Registrar Questões Resolvidas</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SubjectTopicSelector
            subject={formData.subject}
            topic={formData.topic}
            onSubjectChange={handleSubjectChange}
            onTopicChange={handleTopicChange}
          />

          <BankSelector
            value={formData.bank}
            onChange={handleBankChange}
          />

          <QuestionCountInputs
            totalQuestions={formData.totalQuestions}
            correctQuestions={formData.correctQuestions}
            onTotalChange={handleTotalQuestionsChange}
            onCorrectChange={handleCorrectQuestionsChange}
          />

          <SubmitButton
            isSubmitting={isSubmitting}
            disabled={isSubmitting || !isFormValid}
          />
        </form>
      </CardContent>
    </Card>
  );
};

export default QuestionEntryForm;
