import React, { useState } from 'react';
import { Calendar, RotateCcw, Grid3X3, List } from 'lucide-react';
import { UserCycle } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudyPlanHeaderProps {
  userCycle: UserCycle;
}

const StudyPlanHeader: React.FC<StudyPlanHeaderProps> = ({ userCycle }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const formatCycleStartDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        {/* Informações do ciclo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-600">
            <RotateCcw className="w-5 h-5" />
            <span className="text-sm font-medium">
              Ciclos realizados: <span className="text-gray-900">{userCycle.ciclos_realizados || 0}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">
              Início do Ciclo: <span className="text-gray-900">
                {userCycle.criado_em ? formatCycleStartDate(userCycle.criado_em) : 'N/A'}
              </span>
            </span>
          </div>
        </div>

        {/* Controles de visualização */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Visualização em grade"
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Visualização em lista"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanHeader;