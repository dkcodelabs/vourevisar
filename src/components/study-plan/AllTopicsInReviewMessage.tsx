import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllTopicsInReviewMessage = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center"
    >
      <Card className="text-center max-w-md bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Trophy className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-green-800">Parabéns! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-green-700">
            Você já iniciou a revisão de todo o conteúdo! Todas as suas matérias estão em processo de revisão.
          </p>
          <p className="text-green-600 text-sm">
            Para acompanhar suas revisões e estudar os tópicos programados para hoje, acesse a página de Revisões.
          </p>
          <Button 
            onClick={() => navigate('/revisoes')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Ir para Revisões
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AllTopicsInReviewMessage;