import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Flag, Lightbulb } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { FlashcardSession } from '@/features/practice/components/FlashcardSession';
import { PracticeFocusFrame } from '@/features/practice/components/PracticeFocusFrame';
import { PracticeItemRating } from '@/features/practice/components/PracticeItemRating';
import { prototypeQuestion } from '@/features/practice/fixtures/practicePrototypeFixtures';
import { cn } from '@/lib/utils';

const PracticeSession = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selectedOption === prototypeQuestion.correctOptionId;
  const answerLabel = useMemo(
    () => prototypeQuestion.options.find((option) => option.id === prototypeQuestion.correctOptionId)?.label,
    [],
  );

  if (sessionId === 'flashcards-prototipo') return <FlashcardSession />;

  return (
    <PracticeFocusFrame kind="questions" current={1} total={3}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Decida antes de conferir</p>
          <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">Leia como a banca leria</h1>
        </div>

        <article className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_70px_-42px_hsl(var(--primary)/0.8)] ring-1 ring-border">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-primary/[0.07] px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{prototypeQuestion.topic}</p>
              <p className="mt-0.5 text-xs text-content-muted">{prototypeQuestion.subject}</p>
            </div>
            <span className="rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-content-muted shadow-sm ring-1 ring-border">
              {prototypeQuestion.bank} · Certo ou errado
            </span>
          </header>

          <div className="p-5 sm:p-7 lg:p-9">
            <h2 className="max-w-3xl text-balance text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
              {prototypeQuestion.statement}
            </h2>

            <div className="mt-7 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Alternativas">
              {prototypeQuestion.options.map((option) => {
                const selected = selectedOption === option.id;
                const correctOption = submitted && option.id === prototypeQuestion.correctOptionId;
                const wrongSelection = submitted && selected && !correctOption;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={submitted}
                    onClick={() => setSelectedOption(option.id)}
                    className={cn(
                      'flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-100 motion-reduce:transform-none',
                      selected && !submitted && 'bg-primary/[0.09] ring-primary/45 shadow-sm',
                      !selected && !submitted && 'bg-secondary/35 ring-border hover:bg-primary/[0.06] hover:ring-primary/25',
                      correctOption && 'bg-success/10 ring-success/35',
                      wrongSelection && 'bg-destructive/10 ring-destructive/35',
                    )}
                  >
                    <span className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold uppercase ring-1',
                      selected && !submitted && 'bg-primary text-primary-foreground ring-primary',
                      !selected && !submitted && 'bg-card text-content-muted ring-border',
                      correctOption && 'bg-success text-success-foreground ring-success',
                      wrongSelection && 'bg-destructive text-destructive-foreground ring-destructive',
                    )}>
                      {option.id.charAt(0)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {!submitted ? (
              <div className="mt-6 flex justify-end">
                <Button type="button" disabled={!selectedOption} onClick={() => setSubmitted(true)} className="h-11 w-full px-5 disabled:opacity-45 sm:w-auto active:scale-[0.98]">
                  Confirmar resposta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-7 space-y-5" aria-live="polite">
                <div className={cn(
                  'flex gap-3 rounded-2xl p-4 ring-1',
                  isCorrect ? 'bg-success/[0.08] ring-success/25' : 'bg-destructive/[0.08] ring-destructive/25',
                )}>
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{isCorrect ? 'Resposta correta' : `A resposta correta é ${answerLabel}`}</p>
                    <p className="mt-1.5 text-pretty text-sm leading-relaxed text-content-muted">{prototypeQuestion.explanation}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl bg-warning/[0.07] p-4 ring-1 ring-warning/20 sm:grid-cols-[auto_1fr]">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-warning/12 text-warning">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground">Armadilha da banca</p>
                    <p className="mt-1 text-sm leading-relaxed text-content-muted">{prototypeQuestion.trap}</p>
                  </div>
                </div>

                <PracticeItemRating />

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="quiet" size="sm">
                    <Flag className="h-4 w-4" />
                    Reportar problema
                  </Button>
                  <Button type="button" onClick={() => navigate('/treino')} className="h-11">
                    Concluir demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </PracticeFocusFrame>
  );
};

export default PracticeSession;
