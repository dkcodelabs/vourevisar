
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface CompletionMessageProps {
  allDaySubjectsCompleted: boolean;
  isNewCycleStarted: boolean;
  onNextDay: () => void;
}

const CompletionMessage: React.FC<CompletionMessageProps> = ({
  allDaySubjectsCompleted,
  isNewCycleStarted,
  onNextDay
}) => {
  return (
    <AnimatePresence>
      {allDaySubjectsCompleted && (
        <motion.div 
          className="mt-6 text-center p-4 bg-green-50/70 backdrop-blur-lg rounded-xl shadow-lg border-2 border-green-300"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Sparkles size={32} className="mx-auto text-yellow-500 mb-2" />
          <h3 className="text-lg font-bold text-green-800">Parabéns! 🎉</h3>
          <p className="mt-1 text-gray-700 text-sm">Você concluiu todas as matérias do dia!</p>
          {isNewCycleStarted && (
            <p className="mt-1 text-purple-700 text-sm font-medium">
              🔄 Um novo ciclo foi iniciado!
            </p>
          )}
          <p className="mt-2 text-gray-600 text-xs">
            Quer estudar mais matérias hoje? Clique no botão abaixo para avançar.
          </p>
          <Button 
            className="mt-2 bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1"
            onClick={onNextDay}
          >
            Carregar próximas matérias
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompletionMessage;
