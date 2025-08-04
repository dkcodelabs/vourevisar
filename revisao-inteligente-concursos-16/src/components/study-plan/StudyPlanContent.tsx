

import NewCycleMessage from './NewCycleMessage';
import AllStudiesCompletedMessage from './AllStudiesCompletedMessage';
import AllTopicsInReviewMessage from './AllTopicsInReviewMessage';
import CycleCompletedMessage from './CycleCompletedMessage';
import DayCompletedMessage from './DayCompletedMessage';
import StudyPlanEmptyState from './StudyPlanEmptyState';
import StudyPlanMainView from './StudyPlanMainView';
import StudyPlanLoadingState from './StudyPlanLoadingState';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { useApp } from '@/contexts/AppContext';

const StudyPlanContent = () => {
    console.log('🚀 StudyPlanContent renderizado!');
    const { subjects, isLoading: isAppLoading } = useApp();

    const {
        expandedSubject,
        tempMarkedTopics,
        showNewCycleMessage,
        userCycle,
        dailySubjects,
        nextSubjects,
        nextCycleSubjects,
        subjectsByStatus,
        allDaySubjectsCompleted,
        hasAvailableSubjects,
        totalDisciplinasCiclo,
        disciplinasConcluidas,
        allStudiesCompleted,
        handleNextDay,
        handleCompleteSession,
        handleToggleExpand,
        handleMarkTopicForReview,
        handleCancelTopicReview,
        disciplinasIniciadas,
        disciplinasNaoIniciadas,
        disciplinasIniciadasCiclo,
        isCycleCompleted,
        handleStartNewCycle,
        isNextDayLoading,
        showNewCycleStarted,
        allTopicsInReview,
        isCycleLoading,
        isStartingNewCycle
    } = useStudyPlanLogic();

    console.log('📊 StudyPlan render - Estado detalhado:', {
        isAppLoading,
        isCycleLoading,
        allDaySubjectsCompleted,
        hasAvailableSubjects,
        dailySubjectsLength: dailySubjects.length,
        nextSubjectsLength: nextSubjects.length,
        isCycleCompleted,
        allTopicsInReview,
        userCycle: userCycle ? {
            disciplinas_do_dia: userCycle.disciplinas_do_dia,
            ciclo_atual: userCycle.ciclo_atual,
            disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length,
            ciclo_atual_length: userCycle.ciclo_atual?.length
        } : null,
        showNewCycleMessage,
        allStudiesCompleted,
        disciplinasIniciadas: disciplinasIniciadas.length,
        disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
        disciplinasIniciadasCiclo,
        totalDisciplinasCiclo,
        disciplinasConcluidas,
        dailySubjects: dailySubjects.map(s => s.name),
        nextSubjects: nextSubjects.map(s => s.subject.name)
    });

    // Mostrar loading enquanto dados estão carregando
    if (isAppLoading || isCycleLoading || !userCycle) {
        return <StudyPlanLoadingState />;
    }

    const hasSubjects = dailySubjects.length > 0 || nextSubjects.length > 0;
    const hasTopics = subjects.some(s => s.topics && s.topics.length > 0);

    // Debug dos estados para verificar qual condição está sendo atendida
    console.log('🔍 Estados do StudyPlanContent:', {
        allStudiesCompleted,
        allTopicsInReview,
        isCycleCompleted,
        hasAvailableSubjects,
        allDaySubjectsCompleted,
        dailySubjectsLength: dailySubjects.length,
        nextSubjectsLength: nextSubjects.length,
        hasSubjects,
        hasTopics
    });

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="py-8 space-y-6">
                    <NewCycleMessage isVisible={showNewCycleStarted} onHide={() => { }} />
        
                    {allStudiesCompleted ? (
                        <AllStudiesCompletedMessage />
                    ) : allTopicsInReview ? (
                        <AllTopicsInReviewMessage />
                    ) : isCycleCompleted ? (
                        (() => {
                            console.log('🔄 Renderizando CycleCompletedMessage', {
                                isCycleCompleted,
                                handleStartNewCycle: typeof handleStartNewCycle,
                                isStartingNewCycle
                            });
                            return (
                                <CycleCompletedMessage
                                    onStartNewCycle={handleStartNewCycle}
                                    isLoading={isStartingNewCycle}
                                />
                            );
                        })()
                    ) : !hasAvailableSubjects ? (
                        <StudyPlanEmptyState type="no-subjects" />
                    ) : allDaySubjectsCompleted ? (
                        <DayCompletedMessage
                            onNextDay={handleNextDay}
                            onStartNewCycle={() => { }}
                            isLoading={isNextDayLoading}
                            hasMoreSubjectsInCycle={nextSubjects.length > 0}
                        />
                    ) : dailySubjects.length === 0 && nextSubjects.length > 0 ? (
                        <StudyPlanEmptyState
                            type="no-subjects-but-pending"
                            onNextDay={handleNextDay}
                            isNextDayLoading={isNextDayLoading}
                        />
                    ) : dailySubjects.length === 0 ? (
                        <StudyPlanEmptyState type="no-subjects-for-today" />
                    ) : (
                        <StudyPlanMainView
                            userCycle={userCycle!}
                            dailySubjects={dailySubjects}
                            nextSubjects={nextSubjects}
                            nextCycleSubjects={nextCycleSubjects}
                            subjectsByStatus={subjectsByStatus}
                            expandedSubject={expandedSubject}
                            tempMarkedTopics={tempMarkedTopics}
                            disciplinasConcluidas={disciplinasConcluidas}
                            totalDisciplinasCiclo={totalDisciplinasCiclo}
                            disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
                            disciplinasNaoIniciadas={disciplinasNaoIniciadas.length}
                            showNewCycleStarted={showNewCycleStarted}
                            allDaySubjectsCompleted={allDaySubjectsCompleted}
                            isCycleCompleted={isCycleCompleted}
                            allTopicsInReview={allTopicsInReview}
                            onToggleExpand={handleToggleExpand}
                            onMarkTopicForReview={handleMarkTopicForReview}
                            onCancelTopicReview={handleCancelTopicReview}
                            onCompleteSession={handleCompleteSession}
                        />
                    )}

                    {!hasTopics && hasSubjects && (
                        <StudyPlanEmptyState type="no-topics" />
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudyPlanContent;
