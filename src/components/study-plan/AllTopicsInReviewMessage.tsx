
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, CheckCircle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllTopicsInReviewMessage = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center"
    >
      <Card className="text-center max-w-xl bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg">
        <CardHeader className="pb-4">
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="p-4 bg-emerald-100 rounded-full">
              <Trophy className="h-12 w-12 text-emerald-600" />
            </div>
          </motion.div>
          
          <CardTitle className="text-xl font-bold text-emerald-800 mb-2">
            🎉 Parabéns! Marco Histórico! 🎉
          </CardTitle>
          
          <div className="flex items-center justify-center gap-2 text-emerald-700 font-medium">
            <BookOpen className="h-5 w-5" />
            <span>Todos os tópicos marcados para revisão!</span>
            <CheckCircle className="h-5 w-5" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-emerald-100 p-4 rounded-lg border border-emerald-200">
            <p className="text-emerald-800 font-medium mb-2">
              ✨ Conquista Desbloqueada!
            </p>
            <p className="text-emerald-700 text-sm leading-relaxed">
              Você completou a fase inicial de aprendizado de todos os seus tópicos! 
              Agora eles estão em processo de revisão programada.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-medium mb-1">
              🚀 Próximo passo:
            </p>
            <p className="text-blue-700 text-sm">
              Continue com as revisões para dominar completamente todo o conteúdo!
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/revisoes')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
          >
            <Trophy className="h-5 w-5 mr-2" />
            Continuar com as Revisões
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <p className="text-emerald-600 text-xs font-medium">
            🎯 As revisões são a chave para a maestria completa!
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AllTopicsInReviewMessage;
