import {
  RevealCard,
  RevealCardFront,
  RevealCardBack,
  HoverRevealCard,
  StatsRevealCard,
  SubjectRevealCard,
} from '@/components/ui/reveal-card';
import { ActionAlert } from '@/components/ui/action-alert';
import { BookOpen, Sparkles, Trophy, Flame, BellRing } from 'lucide-react';

export default function RevealCardsPage() {
  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Galeria de Reveal Cards</h1>
        <p className="text-sm text-content-muted mt-1">
          Página de referência para visualização e preservação de componentes visuais com efeitos de revelação/hover.
        </p>
      </div>

      <section className="space-y-6" aria-labelledby="action-alert-heading">
        <div>
          <h2 id="action-alert-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BellRing className="size-5 text-warning" aria-hidden="true" />
            1. Alerta com ação
          </h2>
          <p className="mt-1 text-sm text-content-muted">
            Aviso persistente para decisões importantes, com ação opcional e prioridade semântica.
          </p>
        </div>

        <div className="space-y-4">
          <ActionAlert
            title="Depois de configurar o local, não será possível fazer mudanças"
            actionLabel="Saiba mais"
            actionHref="#action-alert-usage"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <ActionAlert
              variant="info"
              title="Seu próximo ciclo já está pronto"
              description="Confira as matérias antes de iniciar a primeira sessão."
              actionLabel="Ver ciclo"
              actionHref="/ciclo-estudos"
            />
            <ActionAlert
              variant="success"
              title="Alterações salvas com segurança"
              description="O novo planejamento já está disponível em todos os seus dispositivos."
            />
          </div>
        </div>

        <div id="action-alert-usage" className="rounded-xl border border-border bg-muted/40 p-4">
          <h3 className="font-semibold text-foreground">Importar e usar</h3>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-4 text-sm text-foreground">
            <code>{`import { ActionAlert } from "@/components/ui";

<ActionAlert
  title="Depois de configurar o local, não será possível fazer mudanças"
  actionLabel="Saiba mais"
  actionHref="/ajuda"
/>`}</code>
          </pre>
        </div>
      </section>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">2. Stats Reveal Card</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsRevealCard
            title="Sequência de Estudos"
            value="14 Dias"
            icon={Flame}
            iconColor="text-amber-500"
            description="Recorde atual: 28 dias"
            details={<p className="text-sm text-content-muted">42 dias ativos · média diária de 1h 30m</p>}
          />
          <StatsRevealCard
            title="Revisões Feitas"
            value="328"
            icon={Trophy}
            iconColor="text-emerald-500"
            description="328 contatos concluídos"
            details={<p className="text-sm text-content-muted">Referência visual preservada, sem retenção estimada.</p>}
          />
          <StatsRevealCard
            title="Matérias Ativas"
            value="8"
            icon={BookOpen}
            iconColor="text-primary"
            description="No ciclo atual"
            details={<p className="text-sm text-content-muted">64% dos tópicos iniciados · 48h registradas</p>}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">3. Subject Reveal Card</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SubjectRevealCard
            name="Direito Administrativo"
            topicCount={18}
            completedTopics={12}
            lastStudied="Ontem"
            nextReview="Hoje"
            status="Em Estudo"
          />
          <SubjectRevealCard
            name="Direito Constitucional"
            topicCount={24}
            completedTopics={20}
            lastStudied="3 dias atrás"
            nextReview="Amanhã"
            status="Em Estudo"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">4. Hover Reveal Card</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <HoverRevealCard
            front={
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Sparkles className="text-primary" size={28} />
                <h3 className="font-bold text-foreground">Passe o mouse</h3>
                <p className="text-xs text-content-muted">Revele o conteúdo oculto no verso</p>
              </div>
            }
            back={
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">Dica Estratégica</p>
                <p className="text-xs text-content-muted">
                  Revise os tópicos prioritários nos primeiros 15 dias após o primeiro contato.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
