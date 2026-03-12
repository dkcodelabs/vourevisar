import React from "react"
import { BookOpen, Clock, TrendingUp, CheckCircle, Star, Target, Zap, Calendar, Award } from "lucide-react"
import {
    RevealCard,
    RevealCardFront,
    RevealCardBack,
    HoverRevealCard,
    StatsRevealCard,
    SubjectRevealCard,
} from "@/components/ui"

// ============ Página de Demonstração ============
const RevealCardDemo: React.FC = () => {
    return (
        <div className="p-8 space-y-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Cards com Revelação no Hover
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Componentes interativos que revelam conteúdo adicional quando você passa o mouse,
                    criando experiências dinâmicas e envolventes.
                </p>
            </div>

            {/* Seção 1: HoverRevealCard - Uso Simples */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="text-primary" size={24} />
                    Hover Reveal Card (Uso Simples)
                </h2>
                <p className="text-muted-foreground mb-6">
                    O componente mais simples - perfeito para revelação rápida de informações adicionais.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Exemplo 1: Estatísticas */}
                    <HoverRevealCard variant="default"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-primary/10 w-fit mx-auto">
                                    <TrendingUp className="text-primary" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Progresso Semanal</h3>
                                <p className="text-3xl font-bold text-primary">85%</p>
                                <p className="text-sm text-muted-foreground">Complete sua meta</p>
                            </div>
                        }
                        back={
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Questões resolvidas</span>
                                    <span className="font-medium">127/150</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Horas estudadas</span>
                                    <span className="font-medium">12.5h</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Revisões feitas</span>
                                    <span className="font-medium">43</span>
                                </div>
                            </div>
                        }
                    />

                    {/* Exemplo 2: Matéria */}
                    <HoverRevealCard variant="glass"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 w-fit mx-auto">
                                    <BookOpen className="text-blue-600 dark:text-blue-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Direito Constitucional</h3>
                                <p className="text-sm text-muted-foreground">12 tópicos</p>
                                <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden mx-4">
                                    <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">75% completo</p>
                            </div>
                        }
                        back={
                            <div className="space-y-4">
                                <h4 className="font-semibold text-center">Próximos Tópicos</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="text-green-500" size={16} />
                                        <span className="line-through text-muted-foreground">Princípios Fundamentais</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-yellow-500" />
                                        <span className="text-yellow-600 font-medium">Direitos e Garantias</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                        <span className="text-muted-foreground">Organização do Estado</span>
                                    </li>
                                </ul>
                            </div>
                        }
                    />

                    {/* Exemplo 3: Conquistas */}
                    <HoverRevealCard variant="gradient"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-amber-100 dark:bg-amber-900/30 w-fit mx-auto">
                                    <Award className="text-amber-600 dark:text-amber-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Sequência de Estudos</h3>
                                <p className="text-3xl font-bold text-amber-600">7 dias</p>
                                <p className="text-sm text-muted-foreground">Seguidos!</p>
                            </div>
                        }
                        back={
                            <div className="space-y-4">
                                <h4 className="font-semibold text-center">Conquistas Desbloqueadas</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { icon: "🔥", label: "Iniciante" },
                                        { icon: "📚", label: "Estudioso" },
                                        { icon: "⭐", label: "Dedicado" },
                                    ].map((badge, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-amber-100/50 dark:bg-amber-900/20 text-center">
                                            <span className="text-2xl">{badge.icon}</span>
                                            <p className="text-xs mt-1">{badge.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        }
                    />
                </div>
            </section>

            {/* Seção 2: RevealCard - Uso Avançado */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Target className="text-primary" size={24} />
                    Reveal Card (Uso Avançado)
                </h2>
                <p className="text-muted-foreground mb-6">
                    Componente mais flexível com controle granular sobre frente e verso.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RevealCard variant="default" animation="slide">
                        <RevealCardFront
                            icon={Clock}
                            iconColor="text-purple-500"
                            title="Próxima Revisão"
                            subtitle="Espaço Repetition"
                        >
                            <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">Em 2h</p>
                            </div>
                        </RevealCardFront>
                        <RevealCardBack>
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg">Tópicos para Revisão</h4>
                                <ul className="space-y-3">
                                    {[
                                        { subject: "Direito Penal", topic: "Crime Doloso", items: 5 },
                                        { subject: "Direito Civil", topic: "Obrigações", items: 3 },
                                        { subject: "Processo Penal", topic: "Inquérito", items: 4 },
                                    ].map((item, idx) => (
                                        <li key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">{item.topic}</p>
                                                <p className="text-xs text-muted-foreground">{item.subject}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                                {item.items} itens
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </RevealCardBack>
                    </RevealCard>

                    <RevealCard variant="glass" animation="fade">
                        <RevealCardFront
                            icon={Star}
                            iconColor="text-yellow-500"
                            title="Nível Atual"
                            subtitle="XP accumulation"
                        >
                            <div className="mt-4">
                                <div className="flex items-end justify-center gap-1">
                                    <span className="text-4xl font-bold text-yellow-500">2.450</span>
                                    <span className="text-muted-foreground mb-1">XP</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">Nível 12</p>
                            </div>
                        </RevealCardFront>
                        <RevealCardBack>
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg">Próximo Nível</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Progresso</span>
                                        <span>45%</span>
                                    </div>
                                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full w-[45%] bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        550 XP para o próximo nível
                                    </p>
                                </div>
                                <div className="pt-4 border-t">
                                    <h5 className="font-medium mb-2">Recompensas</h5>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                                            +50% XP
                                        </span>
                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                                            Badge Exclusiva
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </RevealCardBack>
                    </RevealCard>
                </div>
            </section>

            {/* Seção 3: StatsRevealCard - Para Estatísticas */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="text-primary" size={24} />
                    Stats Reveal Card (Estatísticas)
                </h2>
                <p className="text-muted-foreground mb-6">
                    Perfeito para exibir métricas com detalhes revelados no hover.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsRevealCard
                        icon={CheckCircle}
                        iconColor="text-green-500"
                        title="Questões Acertadas"
                        value="847"
                        description="Total this month"
                        trend={{ value: 12, isPositive: true }}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">This week</span>
                                <span className="font-medium">203</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Last week</span>
                                <span className="font-medium">181</span>
                            </div>
                        </div>
                    </StatsRevealCard>

                    <StatsRevealCard
                        icon={Clock}
                        iconColor="text-blue-500"
                        title="Tempo de Estudo"
                        value="48h"
                        description="This week"
                        trend={{ value: 8, isPositive: true }}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Yesterday</span>
                                <span className="font-medium">6.5h</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Average</span>
                                <span className="font-medium">5.2h</span>
                            </div>
                        </div>
                    </StatsRevealCard>

                    <StatsRevealCard
                        icon={Target}
                        iconColor="text-red-500"
                        title="Taxa de Acerto"
                        value="78%"
                        description="Overall accuracy"
                        trend={{ value: 3, isPositive: true }}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Easy questions</span>
                                <span className="font-medium text-green-500">92%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Medium</span>
                                <span className="font-medium text-yellow-500">76%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Hard</span>
                                <span className="font-medium text-red-500">54%</span>
                            </div>
                        </div>
                    </StatsRevealCard>

                    <StatsRevealCard
                        icon={Calendar}
                        iconColor="text-purple-500"
                        title="Revisões Feitas"
                        value="156"
                        description="This month"
                        trend={{ value: 15, isPositive: true }}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pending</span>
                                <span className="font-medium">23</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Skipped</span>
                                <span className="font-medium">8</span>
                            </div>
                        </div>
                    </StatsRevealCard>
                </div>
            </section>

            {/* Seção 4: SubjectRevealCard - Para Matérias */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <BookOpen className="text-primary" size={24} />
                    Subject Reveal Card (Matérias)
                </h2>
                <p className="text-muted-foreground mb-6">
                    Especialmente desenvolvido para exibir informações de matérias com progresso.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <SubjectRevealCard
                        name="Direito Constitucional"
                        topicCount={15}
                        completedTopics={12}
                        status="Em Estudo"
                        lastStudied="Há 2 dias"
                        nextReview="Hoje, 14:00"
                    />

                    <SubjectRevealCard
                        name="Direito Penal"
                        topicCount={20}
                        completedTopics={8}
                        status="Em Estudo"
                        lastStudied="Há 5 dias"
                        nextReview="Amanhã"
                    />

                    <SubjectRevealCard
                        name="Direito Civil"
                        topicCount={25}
                        completedTopics={25}
                        status="Concluída"
                        lastStudied="Há 10 dias"
                    />

                    <SubjectRevealCard
                        name="Processo Penal"
                        topicCount={12}
                        completedTopics={0}
                        status="Nova"
                    />
                </div>
            </section>

            {/* Seção 5: Exemplos Interativos */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="text-primary" size={24} />
                    Exemplos Interativos
                </h2>
                <p className="text-muted-foreground mb-6">
                    Cards interativos com ações e informações dinâmicas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card com botões */}
                    <HoverRevealCard variant="default"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 w-fit mx-auto">
                                    <Target className="text-indigo-600 dark:text-indigo-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Meta Diária</h3>
                                <p className="text-3xl font-bold text-indigo-600">45/50</p>
                                <p className="text-sm text-muted-foreground">questões</p>
                            </div>
                        }
                        back={
                            <div className="space-y-4">
                                <button className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                                    Continuar Estudos
                                </button>
                                <button className="w-full py-2 px-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-colors">
                                    Ver Detalhes
                                </button>
                            </div>
                        }
                    />

                    {/* Card com gráficos */}
                    <HoverRevealCard variant="gradient"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 w-fit mx-auto">
                                    <TrendingUp className="text-cyan-600 dark:text-cyan-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Performance</h3>
                                <p className="text-3xl font-bold text-cyan-600">+23%</p>
                                <p className="text-sm text-muted-foreground">vs última semana</p>
                            </div>
                        }
                        back={
                            <div className="flex items-end justify-between gap-1 h-20 px-4">
                                {[40, 65, 45, 80, 55, 90, 75].map((height, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t"
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        }
                    />

                    {/* Card com lista de tarefas */}
                    <HoverRevealCard variant="glass"
                        front={
                            <div className="text-center py-8">
                                <div className="mb-4 p-4 rounded-2xl bg-orange-100 dark:bg-orange-900/30 w-fit mx-auto">
                                    <Calendar className="text-orange-600 dark:text-orange-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Hoje</h3>
                                <p className="text-3xl font-bold text-orange-600">3/5</p>
                                <p className="text-sm text-muted-foreground">tarefas</p>
                            </div>
                        }
                        back={
                            <div className="space-y-2">
                                {[
                                    { text: "Revisar Direito Penal", done: true },
                                    { text: "Estudar Obrigações", done: true },
                                    { text: "Finalizar questões", done: true },
                                    { text: "Nova revisão SP", done: false },
                                    { text: "Verificar erros", done: false },
                                ].map((task, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                                            {task.done && <CheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={task.done ? "line-through text-muted-foreground" : ""}>
                                            {task.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        }
                    />
                </div>
            </section>

            {/* Footer com instruções */}
            <section className="mt-12 p-6 bg-muted/50 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4">Como Usar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <h4 className="font-medium mb-2">Importação</h4>
                        <pre className="bg-background p-4 rounded-xl overflow-x-auto">
                            <code>{`import {
  HoverRevealCard,
  StatsRevealCard,
  SubjectRevealCard,
} from "@/components/ui"`}</code>
                        </pre>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Props Disponíveis</h4>
                        <ul className="space-y-1 text-muted-foreground">
                            <li>• <code>variant</code>: "default" | "glass" | "gradient" | "bordered"</li>
                            <li>• <code>animation</code>: "slide" | "fade" | "flip" | "scale"</li>
                            <li>• <code>height</code>: "auto" | "fixed"</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default RevealCardDemo
