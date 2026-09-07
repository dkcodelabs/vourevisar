import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Database,
  FilePenLine,
  FileUp,
  RefreshCw,
  Route,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { ActivationTrack } from '@/features/activation/components/ActivationTrack';
import { useActivationJourney } from '@/features/activation/hooks/useActivationJourney';
import { useActivationTelemetry } from '@/features/activation/hooks/useActivationTelemetry';
import { Button } from '@/components/ui/button';
import { PageLoadingState } from '@/components/ui/PageLoadingState';

const benefits = [
  { icon: Route, text: 'Uma próxima ação clara para estudar' },
  { icon: BrainCircuit, text: 'Revisões organizadas pelo seu histórico' },
  { icon: BookOpenCheck, text: 'Progresso ligado ao conteúdo do edital' },
] as const;

export default function Activation() {
  const reduceMotion = useReducedMotion();
  const { journey, isLoading, isError, refetch } = useActivationJourney();
  const { logMethodSelection } = useActivationTelemetry(journey);

  if (isLoading || !journey) {
    if (isError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-extrabold text-foreground">Não consegui montar seu ponto de partida.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Seus dados continuam salvos. Tente buscar o estado da sua preparação novamente.</p>
            <Button className="mt-6" onClick={() => void refetch()}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return <PageLoadingState label="Preparando seu ponto de partida" />;
  }

  if (journey.kind === 'activated') {
    return <Navigate to="/dashboard" replace />;
  }

  const contextLabel = journey.edital
    ? `${journey.edital.name} · ${journey.edital.subjectCount} ${journey.edital.subjectCount === 1 ? 'matéria' : 'matérias'}`
    : null;

  return (
    <main className="w-full pb-10">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0.7, clipPath: 'inset(0 0 12% 0 round 16px)' }}
        animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0 round 16px)' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl bg-[hsl(var(--activation-ink))] text-white shadow-[0_24px_64px_-36px_rgba(17,16,37,0.8)]"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[44%] bg-[linear-gradient(135deg,transparent_15%,hsl(var(--primary)/0.16)_100%)] lg:block" />
        <div className="relative grid gap-10 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-center lg:px-11 lg:py-12">
          <div className="min-w-0">
            <h2 className="max-w-[18ch] text-balance text-[clamp(2rem,5vw,3.65rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              {journey.title}
            </h2>
            <p className="mt-5 max-w-[62ch] text-[15px] font-medium leading-7 text-blue-100/75 sm:text-base">
              {journey.description}
            </p>
            {contextLabel ? (
              <p className="mt-5 max-w-full truncate text-sm font-bold text-[hsl(var(--activation-lime))]" title={contextLabel}>
                {contextLabel}
              </p>
            ) : null}
            <Button asChild size="lg" className="mt-7 min-h-12 bg-primary px-5 text-white shadow-[0_16px_36px_-20px_hsl(var(--primary)/0.85)] hover:bg-primary/90 dark:text-white">
              <Link
                to={journey.primaryHref}
                state={journey.primaryState}
                onClick={() => logMethodSelection(journey.kind === 'no_edital' ? 'catalog' : 'resume')}
              >
                {journey.primaryActionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[hsl(var(--activation-ink-raised))]/[0.82] p-5 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.8)] sm:p-6">
            <ActivationTrack completedSteps={journey.completedSteps} />
          </div>
        </div>
      </motion.section>

      {journey.kind === 'no_edital' ? (
        <section className="mt-8" aria-labelledby="activation-start-title">
          <div className="max-w-2xl">
            <h2 id="activation-start-title" className="text-2xl font-extrabold tracking-[-0.025em] text-foreground">Comece pelo caminho que já combina com você.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">O Catálogo é o atalho mais simples. IA e criação manual continuam disponíveis quando seu edital exigir.</p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <Link
              to="/meus-editais"
              state={{ openImportModal: true, importTab: 'ready' }}
              onClick={() => logMethodSelection('catalog')}
              className="group flex min-h-36 flex-col justify-between rounded-2xl border border-primary/30 bg-primary/[0.07] p-5 text-foreground transition-colors hover:border-primary/55 hover:bg-primary/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <div className="flex items-start justify-between gap-5">
                <Database className="size-6 text-primary" />
                <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Encontrar no Catálogo</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Escolha um edital já estruturado e copie o conteúdo para sua conta.</p>
              </div>
            </Link>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/meus-editais"
                state={{ openImportModal: true, importTab: 'ia' }}
                onClick={() => logMethodSelection('ai')}
                className="group flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground transition-colors hover:border-[hsl(var(--activation-violet))]/50 hover:bg-[hsl(var(--activation-violet))]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              >
                <FileUp className="size-5 shrink-0 text-[hsl(var(--activation-violet))]" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">Importar PDF com IA</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Para um edital que ainda não está no catálogo.</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/meus-editais"
                state={{ openImportModal: true, importTab: 'manual' }}
                onClick={() => logMethodSelection('manual')}
                className="group flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground transition-colors hover:border-primary/35 hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              >
                <FilePenLine className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">Criar manualmente</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Você controla matérias e tópicos desde o início.</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {journey.kind === 'edital_selection_required' ? (
        <section id="editais-prontos" className="mt-8 scroll-mt-6" aria-labelledby="ready-editais-title">
          <div className="max-w-2xl">
            <h2 id="ready-editais-title" className="text-2xl font-extrabold tracking-[-0.025em] text-foreground">Qual edital deve orientar seu ciclo agora?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Você poderá carregar os outros depois. Esta escolha abre o fluxo existente de matérias e preserva as validações de merge.</p>
          </div>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {journey.eligibleEditais?.map((edital) => (
              <Link
                key={edital.id}
                to={`/meus-editais?sourceId=${encodeURIComponent(edital.id)}`}
                onClick={() => logMethodSelection('resume')}
                className="group flex min-h-20 items-center gap-4 px-4 py-3 text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35 sm:px-5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpenCheck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-extrabold" title={edital.name}>{edital.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{edital.subjectCount} {edital.subjectCount === 1 ? 'matéria pronta' : 'matérias prontas'}</p>
                </div>
                <span className="hidden text-sm font-bold text-primary sm:inline">Escolher</span>
                <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-9 border-t border-border pt-7" aria-label="O que o vouRevisar entrega">
        <div className="grid gap-5 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-[18px]" />
              </div>
              <p className="pt-1.5 text-sm font-semibold leading-5 text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
