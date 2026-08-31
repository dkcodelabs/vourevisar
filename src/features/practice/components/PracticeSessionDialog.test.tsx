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

  const onOpenChange = vi.fn();
  const onStartAnother = vi.fn();

  render(
    <PracticeSessionDialog
      mode={session.mode === 'flashcards_due' ? 'flashcards' : 'questions'}
      session={session}
      onOpenChange={onOpenChange}
      onReveal={onReveal}
      onSubmitAttempt={onSubmitAttempt}
      onRate={onRate}
      onStartAnother={onStartAnother}
    />,
  );

  return { onReveal, onSubmitAttempt, onRate, onOpenChange, onStartAnother };
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
    expect(screen.getByRole('progressbar', { name: /progresso do treino/i })).toHaveAttribute('aria-valuenow', '1');
  });

  it('revela o verso somente após a Edge Function e salva a autoavaliação', async () => {
    const { onReveal, onSubmitAttempt, onRate } = renderDialog(flashcardSession);
    onReveal.mockResolvedValue(answer);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('effortful'), answer });

    expect(screen.getByText(/busca o verso já salvo\. não usa ia\./i)).toBeInTheDocument();
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
    expect(screen.getByText(/este flashcard foi útil/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /flashcard útil/i }));
    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-flashcard',
        itemId: 'item-flashcard',
        rating: 1,
      }));
    });
  });

  it('não oferece outro treino quando a sessão foi concluída sem falhas', async () => {
    const { onSubmitAttempt, onOpenChange, onStartAnother } = renderDialog(questionSession);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('correct'), answer: questionAnswer });

    fireEvent.click(screen.getByRole('radio', { name: /certo/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));
    await screen.findByText(/resposta correta/i);
    fireEvent.click(screen.getByRole('button', { name: /ver resultado/i }));
    expect(await screen.findByText('Questões concluídas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fazer outro treino|reforçar falhas/i })).not.toBeInTheDocument();
    expect(onStartAnother).not.toHaveBeenCalled();
  });

  it('oferece reforço e preenche a intenção quando houve dificuldade', async () => {
    const { onReveal, onSubmitAttempt, onOpenChange, onStartAnother } = renderDialog(flashcardSession);
    onReveal.mockResolvedValue(answer);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('effortful'), answer });

    fireEvent.click(await screen.findByRole('button', { name: /revelar resposta/i }));
    expect(await screen.findByText(answer.explanation)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /com esforço/i }));
    fireEvent.click(screen.getByRole('button', { name: /ver resultado/i }));
    const reinforceButton = await screen.findByRole('button', { name: /reforçar este tópico/i });
    fireEvent.click(reinforceButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onStartAnother).toHaveBeenCalledWith({ goal: 'reinforce', topicId: 'topic-1', format: 'flashcards' });
  });

  it('mostra acertos, erros e aproveitamento ao concluir questões', async () => {
    const { onSubmitAttempt } = renderDialog(questionSession);
    onSubmitAttempt.mockResolvedValue({ attempt: attempt('incorrect'), answer: questionAnswer });

    fireEvent.click(screen.getByRole('radio', { name: /certo/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));
    await screen.findByText(/a resposta correta/i);
    fireEvent.click(screen.getByRole('button', { name: /ver resultado/i }));

    expect(await screen.findByText('Acertos')).toBeInTheDocument();
    expect(screen.getByText('Erros')).toBeInTheDocument();
    expect(screen.getByText('Aproveitamento')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
