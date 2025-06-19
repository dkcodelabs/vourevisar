
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, Stars, Sparkles, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllTopicsInReviewMessage = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="flex justify-center"
    >
      <Card className="text-center max-w-lg bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200 shadow-xl">
        <CardHeader className="pb-4">
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <div className="relative p-4 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full">
              <Trophy className="h-16 w-16 text-emerald-600" />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-1"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Stars className="h-5 w-5 text-amber-500" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CardTitle className="text-2xl font-bold text-emerald-800 mb-2">
              🎉 Incrível! Missão Cumprida! 🎉
            </CardTitle>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-6 px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Todos os Tópicos Marcados para Revisão</span>
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            
            <p className="text-emerald-800 font-medium text-lg leading-relaxed">
              Parabéns! Você conquistou um marco importante na sua jornada de estudos. 
              <strong className="text-emerald-900"> Todos os seus tópicos já foram iniciados e estão agora em processo de revisão!</strong>
            </p>
            
            <div className="bg-emerald-100/60 p-4 rounded-lg border border-emerald-200">
              <p className="text-emerald-700 text-sm leading-relaxed">
                ✨ <strong>O que isso significa?</strong> Você já passou pela fase inicial de aprendizado de todo o conteúdo. 
                Agora é hora de consolidar o conhecimento através das revisões programadas!
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button 
              onClick={() => navigate('/revisoes')}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3 px-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              <Trophy className="h-5 w-5 mr-2" />
              Continuar com as Revisões
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-emerald-600 text-xs"
          >
            Mantenha o ritmo! As revisões são fundamentais para a fixação do conhecimento 📚
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AllTopicsInReviewMessage;
