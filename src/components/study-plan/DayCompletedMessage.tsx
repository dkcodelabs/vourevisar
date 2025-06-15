
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DayCompletedMessageProps {
  onNextDay: () => void;
  isLoading?: boolean;
}

const DayCompletedMessage: React.FC<DayCompletedMessageProps> = ({ 
  onNextDay, 
  isLoading = false 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg w-full">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Parabéns! 🎉
          </h2>
          
          <p className="text-green-700 mb-4">
            Você concluiu todas as disciplinas do dia!
          </p>
          
          <p className="text-gray-600 text-sm mb-6">
            Quer estudar mais matérias hoje? Clique no botão abaixo para carregar as próximas disciplinas.
          </p>
          
          <Button 
            onClick={onNextDay}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all duration-300"
          >
            {isLoading ? (
              <LoadingSpinner className="h-4 w-4 mr-2" />
            ) : (
              <ArrowRight className="ml-2 h-4 w-4" />
            )}
            {isLoading ? 'Carregando...' : 'Carregar próximas matérias'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DayCompletedMessage;
