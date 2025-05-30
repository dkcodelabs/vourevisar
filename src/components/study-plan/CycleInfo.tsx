import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Sparkle, CheckCircle, Calendar } from '@phosphor-icons/react';

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
  disciplinasIniciadas: number;
  disciplinasNaoIniciadas: number;
}

const CycleInfo: React.FC<CycleInfoProps> = ({
  userCycle,
  disciplinasConcluidas,
  totalDisciplinasCiclo,
  isNewCycleStarted,
  disciplinasIniciadas,
  disciplinasNaoIniciadas
}) => {
  return (
    <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow w-full">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkle size={16} className="text-yellow-500" weight="fill" />
              <p className="text-xs text-gray-600">
                Ciclos realizados: <span className="font-semibold text-app-blue">{userCycle.ciclos_realizados}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" weight="fill" />
              <p className="text-xs text-gray-600">
                Disciplinas do ciclo: <span className="font-semibold text-app-blue">{disciplinasConcluidas}/{totalDisciplinasCiclo}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500" weight="fill" />
              <p className="text-xs text-gray-600">
                Disciplinas Iniciadas: <span className="font-semibold text-app-blue">{disciplinasIniciadas}/{totalDisciplinasCiclo}</span>
              </p>
            </div>
            {isNewCycleStarted && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-purple-500" weight="fill" />
                <p className="text-xs text-purple-600 font-medium">
                  🔄 Novo ciclo iniciado!
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar size={16} className="text-purple-500" weight="fill" />
            Início: {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CycleInfo;
