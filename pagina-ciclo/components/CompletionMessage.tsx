
import React from 'react';
import { TrophyIcon } from './Icons';

interface CompletionMessageProps {
  onStartNewCycle: () => void;
}

const CompletionMessage: React.FC<CompletionMessageProps> = ({ onStartNewCycle }) => {
  return (
    <div className="text-center p-8 md:p-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-emerald-500/20 flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-emerald-500">
         <TrophyIcon className="h-20 w-20" />
      </div>
      <h3 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
        Parabéns!
      </h3>
      <p className="max-w-md text-gray-600 dark:text-slate-400">
        Você concluiu todas as suas revisões para o ciclo de hoje. Ótimo trabalho! Descanse ou, se estiver pronto, inicie o próximo ciclo de estudos.
      </p>
      <button
        onClick={onStartNewCycle}
        className="mt-4 px-8 py-3 bg-sky-600 text-white font-bold rounded-lg transition-all duration-300 hover:bg-sky-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        Iniciar Próximo Ciclo de Estudos
      </button>
    </div>
  );
};

export default CompletionMessage;
