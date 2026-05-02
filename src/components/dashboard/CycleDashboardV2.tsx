import React from 'react';
import { Play, RotateCcw, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { CycleRotation, CycleSubjectState } from '@/hooks/useStudyCycleV2';
import { Subject } from '@/types';

interface CycleDashboardV2Props {
  activeRotation: CycleRotation | null;
  subjectStates: CycleSubjectState[];
  subjects: Subject[];
  onFinishRotation: () => void;
  onInitializeCycle: (subjectIds: string[]) => void;
}

export const CycleDashboardV2: React.FC<CycleDashboardV2Props> = ({
  activeRotation,
  subjectStates,
  subjects,
  onFinishRotation,
  onInitializeCycle
}) => {
  if (!activeRotation) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play size={20} className="text-primary ml-1" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-2">
          Motor de Ciclo V2
        </h3>
        <p className="text-xs text-content-muted mb-6 leading-relaxed">
          Seu ciclo inteligente está pronto para ser ativado. Acompanhe a velocidade do seu giro e veja gargalos em tempo real.
        </p>
        <button
          onClick={() => onInitializeCycle(subjects.map(s => s.id))}
          disabled={subjects.length === 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
        >
          {subjects.length === 0 ? "Adicione matérias primeiro" : "Iniciar Motor V2"}
        </button>
      </div>
    );
  }

  // Cálculos de Progresso
  const totalSubjects = subjects.length;
  const completedSubjects = subjectStates.filter(s => s.completed_in_current_rotation).length;
  const progressPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

  // Duração do Giro Atual
  const startDate = activeRotation.started_at ? new Date(activeRotation.started_at) : new Date();
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // Identificar Matéria Estagnada (Mais antiga estudada)
  const stagnantStates = subjectStates
    .filter(s => s.last_studied_date)
    .sort((a, b) => new Date(a.last_studied_date!).getTime() - new Date(b.last_studied_date!).getTime());
  
  let stagnantSubject = null;
  let stagnantDays = 0;

  if (stagnantStates.length > 0) {
    const oldest = stagnantStates[0];
    const oldDate = new Date(oldest.last_studied_date!);
    stagnantDays = Math.floor((now.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (stagnantDays >= 3) {
      const subj = subjects.find(s => s.id === oldest.subject_id);
      if (subj) stagnantSubject = subj.name;
    }
  }

  // Inteligência de Ciclo
  const subjectsLeft = totalSubjects - completedSubjects;
  const subjectsPerDay = diffDays > 0 ? completedSubjects / diffDays : 0;
  const daysToFinish = subjectsPerDay > 0 ? Math.ceil(subjectsLeft / subjectsPerDay) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo do Giro */}
      <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <RotateCcw size={80} />
        </div>
        
        <div className="flex items-center justify-between mb-4 relative">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary/80">
            Giro Atual
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
            #{activeRotation.rotation_number}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-4 relative">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/20"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={301.5}
              strokeDashoffset={301.5 - (301.5 * progressPercentage) / 100}
              className="text-primary transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black">{progressPercentage}%</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-content-muted">Completo</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-muted/20 border border-border/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black text-content-muted uppercase mb-1">Estudadas</p>
            <p className="text-lg font-black text-foreground">{completedSubjects}</p>
          </div>
          <div className="bg-muted/20 border border-border/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black text-content-muted uppercase mb-1">Restantes</p>
            <p className="text-lg font-black text-foreground">{subjectsLeft}</p>
          </div>
        </div>

        {progressPercentage === 100 && (
          <button
            onClick={onFinishRotation}
            className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            FINALIZAR GIRO
          </button>
        )}
      </div>

      {/* Velocidade e Previsão */}
      <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Clock size={16} className="text-blue-500" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-content-main">
            Inteligência de Ritmo
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-content-muted font-bold uppercase">Ritmo Atual</span>
              <span className="text-foreground font-black">{subjectsPerDay.toFixed(1)} mat/dia</span>
            </div>
            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-500" 
                 style={{ width: `${Math.min(subjectsPerDay * 30, 100)}%` }}
               />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-content-muted leading-relaxed">
              {daysToFinish !== null && daysToFinish > 0 ? (
                <>
                  Faltam aprox. <strong className="text-foreground">{daysToFinish} dias</strong> para você bater este giro no ritmo atual.
                </>
              ) : (
                "Continue estudando para gerar sua estimativa de conclusão."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Gargalo */}
      {stagnantSubject && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-rose-500" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 mb-1">
                Matéria Estagnada
              </h4>
              <p className="text-[13px] text-rose-400/80 leading-tight">
                Você não toca em <strong className="text-rose-400">{stagnantSubject}</strong> há {stagnantDays} dias. Ela está travando o giro do seu ciclo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

