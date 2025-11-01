import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, RotateCcw } from 'lucide-react';

interface NewCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleNumber: number;
  totalSubjects: number;
}

export const NewCycleModal: React.FC<NewCycleModalProps> = ({
  isOpen,
  onClose,
  cycleNumber,
  totalSubjects
}) => {
  if (!isOpen) return null;

  const handleContinue = () => {
    console.log('✅ Modal OK clicado - fechando modal...');
    onClose();
    // Disparar evento para atualizar componentes
    window.dispatchEvent(new CustomEvent('cycleUpdated', {
      detail: { isNewCycle: true, timestamp: Date.now() }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-4 border-green-300 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          
          <CardHeader className="text-center pb-4 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.5 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <Trophy className="h-16 w-16 text-yellow-500 drop-shadow-lg" />
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear"
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                🎉 Novo Ciclo Iniciado!
              </CardTitle>
              <div className="text-lg font-bold text-gray-800 mb-2">
                Ciclo #{cycleNumber}
              </div>
            </motion.div>
          </CardHeader>
          
          <CardContent className="text-center space-y-4 pb-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200"
            >
              <p className="text-gray-700 text-sm leading-relaxed">
                <strong>Parabéns!</strong> Você completou um ciclo de estudos! 
                Todas as <strong>{totalSubjects} matérias</strong> foram resetadas 
                e estão prontas para um novo ciclo de revisões.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-3 text-lg w-full"
                size="lg"
              >
                OK
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-xs text-gray-500 italic"
            >
              💡 Dica: Continue mantendo a consistência nos estudos!
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NewCycleModal;