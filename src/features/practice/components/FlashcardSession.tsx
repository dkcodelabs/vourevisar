import { useState } from 'react';
import { ArrowRight, Check, Eye, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PracticeFocusFrame } from '@/features/practice/components/PracticeFocusFrame';
import { prototypeFlashcard } from '@/features/practice/fixtures/practicePrototypeFixtures';
import { cn } from '@/lib/utils';

type RecallRating = 'forgotten' | 'effortful' | 'recalled';

const recallOptions: Array<{ value: RecallRating; label: string; detail: string }> = [
  { value: 'forgotten', label: 'Não lembrei', detail: 'Rever em breve' },
  { value: 'effortful', label: 'Com esforço', detail: 'Ainda instável' },
  { value: 'recalled', label: 'Lembrei', detail: 'Pode espaçar' },
];

export const FlashcardSession = () => {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<RecallRating | null>(null);

  return (
    <PracticeFocusFrame kind="flashcards" current={1} total={6}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Recupere antes de revelar</p>
          <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">Diga a resposta com suas palavras</h1>
        </div>

        <article className="relative overflow-hidden rounded-[28px] bg-card shadow-[0_24px_70px_-42px_hsl(var(--success)/0.8)] ring-1 ring-border">
          <div className="absolute inset-x-0 top-0 h-1 bg-success" aria-hidden="true" />
          <div className="grid min-h-[480px] lg:grid-cols-[0.95fr_1.05fr]">
            <section className="flex flex-col justify-between bg-success/[0.07] p-6 sm:p-8 lg:p-10">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-success">
                  <Sparkles className="h-4 w-4" />
                  Frente do cartão
                </div>
                <h2 className="mt-8 text-balance text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                  {prototypeFlashcard.front}
                </h2>
              </div>
              <p className="mt-10 text-sm text-content-muted">Tente responder sem consultar as anotações.</p>
            </section>

            <section className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
              {!revealed ? (
                <div className="flex min-h-72 flex-col items-center justify-center text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success ring-1 ring-success/20">
                    <Eye className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">Pronto para conferir?</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-content-muted">A resposta só aparece quando você decidir revelar.</p>
                  <Button type="button" onClick={() => setRevealed(true)} className="mt-6 h-11 bg-success px-5 text-success-foreground hover:bg-success/90 active:scale-[0.98]">
                    Mostrar resposta
                  </Button>
                </div>
              ) : (
                <div aria-live="polite">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-success">
                    <Check className="h-4 w-4" />
                    Resposta
                  </div>
                  <p className="mt-5 text-pretty text-base leading-relaxed text-foreground sm:text-lg">{prototypeFlashcard.back}</p>
                  <div className="mt-6 rounded-2xl bg-success/[0.07] p-4 ring-1 ring-success/15">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-success">Chave de memória</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{prototypeFlashcard.memoryHook}</p>
                  </div>

                  <fieldset className="mt-7">
                    <legend className="text-sm font-semibold text-foreground">Como foi lembrar?</legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {recallOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={rating === option.value}
                          onClick={() => setRating(option.value)}
                          className={cn(
                            'min-h-16 rounded-xl px-3 py-2 text-left ring-1 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50',
                            rating === option.value
                              ? 'bg-success text-success-foreground ring-success'
                              : 'bg-secondary/45 text-foreground ring-border hover:bg-success/10 hover:ring-success/25',
                          )}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className={cn('mt-1 block text-[11px]', rating === option.value ? 'text-success-foreground/75' : 'text-content-muted')}>{option.detail}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                {revealed ? (
                  <Button type="button" variant="quiet" size="sm" onClick={() => { setRevealed(false); setRating(null); }}>
                    <RotateCcw className="h-4 w-4" />
                    Ver pergunta
                  </Button>
                ) : <span />}
                <Button type="button" disabled={!rating} onClick={() => navigate('/treino')} className="h-11 disabled:opacity-45">
                  Concluir demonstração
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        </article>
      </div>
    </PracticeFocusFrame>
  );
};
