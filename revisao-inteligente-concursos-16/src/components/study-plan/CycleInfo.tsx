
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowPathIcon, ClockIcon, QueueListIcon, Squares2X2Icon } from './icons';

interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
}

interface CycleInfoProps {
  userCycle: UserCycle;
  disciplinasConcluidas: number;
  totalDisciplinasCiclo: number;
  isNewCycleStarted: boolean;
  disciplinasIniciadasCiclo: number; // Usar a contagem correta do ciclo
  disciplinasNaoIniciadas: number;
  viewMode: 'list' | 'card';
  onViewModeChange: (mode: 'list' | 'card') => void;
}

const CycleInfo: React.FC<CycleInfoProps> = ({
  userCycle,
  disciplinasConcluidas,
  totalDisciplinasCiclo,
  isNewCycleStarted,
  disciplinasIniciadasCiclo,
  disciplinasNaoIniciadas,
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-lg border border-gray-200/80 rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-y-4">
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-sky-500"/>
            <span>Ciclos realizados: {userCycle.ciclos_realizados}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-indigo-500"/>
            <span>
              Início do Ciclo: {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        </div>
        <div className="flex items-center rounded-lg p-0.5 bg-gray-200 border border-gray-300">
          <button 
            onClick={() => {
              console.log('Clicou em list view, viewMode atual:', viewMode);
              onViewModeChange('list');
            }}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-800'}`}
            aria-label="List view"
            title="List view"
          >
            <QueueListIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              console.log('Clicou em card view, viewMode atual:', viewMode);
              onViewModeChange('card');
            }}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-800'}`}
            aria-label="Card view"
            title="Card view"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CycleInfo;
