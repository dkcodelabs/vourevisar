import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CycleCompletedMessageProps {
  onStartNewCycle: () => void;
  isLoading?: boolean;
}

const CycleCompletedMessage: React.FC<CycleCompletedMessageProps> = ({ onStartNewCycle, isLoading = false }) => {
  console.log('🔄 CycleCompletedMessage renderizado', { onStartNewCycle: typeof onStartNewCycle, isLoading });
  console.log('🔄 CycleCompletedMessage - função recebida:', onStartNewCycle);
  
  return (
    <div>
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
            onClick={() => {
              console.log('🔄 BOTÃO CLICADO!');
              console.log('🔄 onStartNewCycle:', onStartNewCycle);
              console.log('🔄 typeof onStartNewCycle:', typeof onStartNewCycle);
              onStartNewCycle();
            }}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Iniciando...
              </>
            ) : (
              'Iniciar Novo Ciclo'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CycleCompletedMessage; 