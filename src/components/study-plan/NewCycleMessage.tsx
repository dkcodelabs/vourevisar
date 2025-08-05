
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface NewCycleMessageProps {
  isVisible: boolean;
  onHide: () => void;
}

const NewCycleMessage: React.FC<NewCycleMessageProps> = ({ isVisible, onHide }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="w-full mb-4"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-xl">
            <CardContent className="p-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-purple-600" />
              </motion.div>
              
              <h3 className="text-lg font-bold text-purple-800 mb-1">
                🔄 Novo Ciclo Iniciado!
              </h3>
              
              <p className="text-purple-700 text-sm">
                Parabéns! Você completou um ciclo de estudos e iniciou um novo.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewCycleMessage;
