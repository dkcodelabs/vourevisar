import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BookOpen, Target, Eye, Play, Pause, Minus, Plus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';

interface CompactOverviewProps {
    subjects: Subject[];
    overdueCount: number;
    todayCount: number;
    futureCount: number;
}

export const CompactOverview: React.FC<CompactOverviewProps> = ({
    subjects,
    overdueCount,
    todayCount,
    futureCount
}) => {
    const navigate = useNavigate();

    // Hook do Pomodoro Timer
    const {
        timeLeft,
        isActive,
        sessionsToday,
        startTimer,
        pauseTimer,
        resetTimer,
        adjustTime,
        formatTime,
        getSessionsProgress
    } = usePomodoroTimer();

    // Calcular estatísticas de matérias
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(subject => {
        if (!subject.topics || subject.topics.length === 0) return false;
        // Matéria está concluída quando TODOS os tópicos têm reviewStage === 'Concluído'
        return subject.topics.every(topic => topic.reviewStage === 'Concluído');
    }).length;
    const subjectsProgress = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

    // Calcular estatísticas de tópicos
    const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    const completedTopics = subjects.reduce((sum, subject) =>
        sum + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
    );
    const topicsProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // Determinar urgência
    const hasUrgentItems = overdueCount > 0 || todayCount > 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-end">
            {/* Card de Urgente - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full bg-green-500"></div>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <span className="font-semibold text-gray-900 text-sm">Revisão</span>
                            </div>
                        </div>
                        {hasUrgentItems && (
                            <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {overdueCount + todayCount}
                            </div>
                        )}
                    </div>

                    <div className="space-y-0.5 mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">• Atrasados</span>
                            <span className={`font-semibold text-sm ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {overdueCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">• Hoje</span>
                            <span className={`font-semibold text-sm ${todayCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                {todayCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">• Futuras (7 dias)</span>
                            <span className={`font-semibold text-sm ${futureCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                {futureCount}
                            </span>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => navigate('/revisoes')}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Revisões
                    </Button>
                </CardContent>
            </Card>

            {/* Card de Matérias - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full bg-green-500"></div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-500" />
                                <span className="font-semibold text-gray-900 text-sm">Matérias</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Progresso</div>
                            <div className="text-lg font-bold text-gray-900">{subjectsProgress}%</div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                {completedSubjects}/{totalSubjects} Concluídas
                            </span>
                        </div>

                        {/* Barra de Progresso Verde Unificada */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${subjectsProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => navigate('/materias')}
                    >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Ver Matérias
                    </Button>
                </CardContent>
            </Card>

            {/* Card de Tópicos - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full bg-green-500"></div>
                            <div className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-gray-900 text-sm">Tópicos</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Progresso</div>
                            <div className="text-lg font-bold text-gray-900">{topicsProgress}%</div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                {completedTopics}/{totalTopics} Concluídos
                            </span>
                        </div>

                        {/* Barra de Progresso Verde Unificada */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${topicsProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => navigate('/topicos')}
                    >
                        <Target className="h-4 w-4 mr-2" />
                        Ver Tópicos
                    </Button>
                </CardContent>
            </Card>

            {/* Card do Pomodoro Timer - Funcional */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full bg-green-500"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 flex items-center justify-center">
                                    {isActive ? '🔥' : '⏰'}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">Pomodoro</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Timer</div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                    onClick={() => adjustTime(-5)}
                                    disabled={isActive}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <div className="text-lg font-bold text-gray-900 min-w-[60px] text-center">
                                    {formatTime(timeLeft)}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                    onClick={() => adjustTime(5)}
                                    disabled={isActive}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                Sessões hoje {sessionsToday}
                            </span>
                        </div>

                        {/* Barra de Progresso Verde Unificada */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${getSessionsProgress()}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            className={`flex-1 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-white ${isActive
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-purple-500 hover:bg-purple-600'
                                }`}
                            onClick={isActive ? pauseTimer : startTimer}
                        >
                            {isActive ? (
                                <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pausar
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Iniciar Foco
                                </>
                            )}
                        </Button>

                        <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 rounded-lg transition-all duration-200"
                            onClick={resetTimer}
                            title="Reiniciar timer"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};