import {
  RevealCard,
  RevealCardFront,
  RevealCardBack,
  HoverRevealCard,
  StatsRevealCard,
  SubjectRevealCard,
} from '@/components/ui/reveal-card';
import { BookOpen, Sparkles, Trophy, Flame } from 'lucide-react';

export default function RevealCardsPage() {
  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Galeria de Reveal Cards</h1>
        <p className="text-sm text-content-muted mt-1">
          Página de referência para visualização e preservação de componentes visuais com efeitos de revelação/hover.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">1. Stats Reveal Card</h2>
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
        <h2 className="text-lg font-semibold text-foreground">2. Subject Reveal Card</h2>
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
        <h2 className="text-lg font-semibold text-foreground">3. Hover Reveal Card</h2>
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
