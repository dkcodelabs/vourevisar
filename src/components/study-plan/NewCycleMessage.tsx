
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkle } from '@phosphor-icons/react';

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
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-xl">
            <CardContent className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Sparkle className="mx-auto mb-4 h-12 w-12 text-purple-600" weight="fill" />
              </motion.div>
              
              <h2 className="text-xl font-bold text-purple-800 mb-2">
                🔄 Novo Ciclo Iniciado!
              </h2>
              
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
