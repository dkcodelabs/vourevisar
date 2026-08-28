import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PracticeSessionDialog } from '@/features/practice/components/PracticeSessionDialog';
import type { PracticeAnswer, PracticeAttempt, PracticeSession } from '@/features/practice/services/practiceService';

const questionSession: PracticeSession = {
  id: 'session-question',
  mode: 'questions',
  status: 'active',
  topicId: 'topic-1',
  items: [{
    id: 'item-question',
    type: 'true_false',
    prompt: 'A revogação produz efeitos retroativos?',
    options: [{ id: 'correct', label: 'Certo' }, { id: 'incorrect', label: 'Errado' }],
    learningObjective: null,
    depth: 'foundation',
    targetDifficulty: 'basic',
    position: 1,
    servedReason: 'topic_selection',
  }],
};

const flashcardSession: PracticeSession = {
  id: 'session-flashcard',
  mode: 'flashcards_due',
  status: 'active',
  topicId: 'topic-1',
  items: [{
    id: 'item-flashcard',
    type: 'flashcard',
    prompt: 'Qual é o fundamento da revogação?',
    options: [],
    learningObjective: null,
    depth: 'foundation',
    targetDifficulty: 'basic',
    position: 1,
    servedReason: 'flashcard_due',
  }],
};

const answer: PracticeAnswer = {
  itemType: 'flashcard',
  answerKey: {},
  explanation: 'A revogação decorre de conveniência e oportunidade.',
  sourceCitations: [],
};

const questionAnswer: PracticeAnswer = {
  ...answer,
  itemType: 'true_false',
  answerKey: { correctOptionId: 'incorrect' },
};

const attempt = (result: PracticeAttempt['result']): PracticeAttempt => ({
  attemptId: `attempt-${result}`,
  result,
  sessionCompleted: true,
  nextDueAt: null,
});

const renderDialog = (session: PracticeSession) => {
  const onSubmitAttempt = vi.fn();
  const onReveal = vi.fn();
  const onRate = vi.fn();

  render(
    <PracticeSessionDialog
      mode={session.mode === 'flashcards_due' ? 'flashcards' : 'questions'}
      session={session}
      onOpenChange={vi.fn()}
      onReveal={onReveal}
      onSubmitAttempt={onSubmitAttempt}
      onRate={onRate}
      onStartAnother={vi.fn()}
    />,
  );

  return { onReveal, onSubmitAttempt, onRate };
};

describe('PracticeSessionDialog', () => {
  it('só mostra a correção da questão depois da resposta do servidor', async () => {
    const { onSubmitAttempt } = renderDialog(questionSession);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('incorrect'), answer: questionAnswer });

    expect(screen.queryByText(/a resposta correta é errado/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /certo/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));

    await waitFor(() => {
      expect(onSubmitAttempt).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-question',
        itemId: 'item-question',
        answer: { kind: 'objective_answer', optionId: 'correct' },
      }));
    });
    expect(await screen.findByText(/a resposta correta é errado/i)).toBeInTheDocument();
    expect(screen.getByText(questionAnswer.explanation)).toBeInTheDocument();
  });

  it('revela o verso somente após a Edge Function e salva a autoavaliação', async () => {
    const { onReveal, onSubmitAttempt } = renderDialog(flashcardSession);
    onReveal.mockResolvedValue(answer);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('effortful'), answer });

    fireEvent.click(screen.getByRole('button', { name: /revelar resposta/i }));
    await waitFor(() => {
      expect(onReveal).toHaveBeenCalledWith('session-flashcard', 'item-flashcard');
    });
    expect(await screen.findByText(answer.explanation)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /com esforço/i }));
    fireEvent.click(screen.getByRole('button', { name: /ver resultado/i }));
    await waitFor(() => {
      expect(onSubmitAttempt).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-flashcard',
        itemId: 'item-flashcard',
        answer: { kind: 'flashcard_recall', rating: 'effortful' },
      }));
    });
    expect(await screen.findByText(/treino concluído/i)).toBeInTheDocument();
  });
});
