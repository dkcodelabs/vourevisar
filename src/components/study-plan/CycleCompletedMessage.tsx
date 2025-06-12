import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CycleCompletedMessageProps {
  onStartNewCycle: () => void;
}

const CycleCompletedMessage: React.FC<CycleCompletedMessageProps> = ({ onStartNewCycle }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <Card className="bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">
              Ciclo Concluído! 🎉
            </h2>
            <p className="text-yellow-700 mb-4">
              Parabéns! Você completou todas as matérias deste ciclo.
            </p>
            <Button
              onClick={onStartNewCycle}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Iniciar Novo Ciclo
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default CycleCompletedMessage; 