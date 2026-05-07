import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BookOpen, Target, Eye, Play, Pause, Minus, Plus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';

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
        isRunning,
        sessionsToday,
        toggleTimer,
        resetTimer,
        adjustTime,
        formatTime,
        getProgress
    } = useSharedPomodoroTimer();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Card de Urgente - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
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
                    </div>

                    <div className="mt-auto pt-4">
                        <Button
                            size="sm"
                            className="w-full sm:w-auto sm:min-w-[200px] mx-auto flex justify-center items-center bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => navigate('/revisoes')}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Revisões
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Card de Matérias - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
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

                        <div>
                            <span className="text-sm text-gray-600">
                                {completedSubjects} Matérias Concluídas
                            </span>

                            {/* Barra de Progresso Verde Unificada */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${subjectsProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <Button
                            size="sm"
                            className="w-full sm:w-auto sm:min-w-[200px] mx-auto flex justify-center items-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => navigate('/ciclo-estudos')}
                        >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Ver Ciclo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Card de Tópicos - Design Moderno */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
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

                        <div>
                            <span className="text-sm text-gray-600">
                                {completedTopics} Tópicos Concluídos
                            </span>

                            {/* Barra de Progresso Verde Unificada */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${topicsProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <Button
                            size="sm"
                            className="w-full sm:w-auto sm:min-w-[200px] mx-auto flex justify-center items-center bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => navigate('/ciclo-estudos')}
                        >
                            <Target className="h-4 w-4 mr-2" />
                            Ver Ciclo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Card do Pomodoro Timer - Funcional */}
            <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-8 rounded-full bg-green-500"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        {isRunning ? '🔥' : '⏰'}
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
                                        disabled={isRunning}
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
                                        disabled={isRunning}
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
                                    style={{ width: `${getProgress()}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-auto pt-4">
                        <Button
                            size="sm"
                            className={`w-full sm:w-auto sm:min-w-[200px] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-white flex justify-center items-center ${isRunning
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-purple-500 hover:bg-purple-600'
                                }`}
                            onClick={toggleTimer}
                        >
                            {isRunning ? (
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
