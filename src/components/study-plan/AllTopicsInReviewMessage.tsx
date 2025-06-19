
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, Stars, Sparkles, BookOpen, CheckCircle, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllTopicsInReviewMessage = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 120, 
        damping: 25,
        delay: 0.1
      }}
      className="flex justify-center"
    >
      <Card className="text-center max-w-2xl bg-gradient-to-br from-purple-50 via-emerald-50 to-yellow-50 border-emerald-300 shadow-2xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-purple-100/20 to-yellow-100/20" />
        <div className="absolute top-4 left-4 opacity-20">
          <Stars className="h-8 w-8 text-yellow-500" />
        </div>
        <div className="absolute top-6 right-6 opacity-20">
          <Award className="h-6 w-6 text-purple-500" />
        </div>
        <div className="absolute bottom-4 left-6 opacity-20">
          <Sparkles className="h-7 w-7 text-emerald-500" />
        </div>
        
        <CardHeader className="pb-4 relative z-10">
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ rotate: -15, scale: 0.7 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              delay: 0.3,
              duration: 0.8
            }}
          >
            <div className="relative p-6 bg-gradient-to-br from-emerald-200 via-green-200 to-emerald-300 rounded-full shadow-lg">
              <Trophy className="h-20 w-20 text-emerald-700" />
              <motion.div
                className="absolute -top-3 -right-3"
                animate={{ 
                  rotate: [0, 15, -15, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="h-8 w-8 text-yellow-600" />
              </motion.div>
              <motion.div
                className="absolute -bottom-2 -left-2"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                <CheckCircle className="h-7 w-7 text-green-600" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-700 via-green-600 to-emerald-800 bg-clip-text text-transparent mb-3">
              🎉 PARABÉNS! MARCO HISTÓRICO! 🎉
            </CardTitle>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-8 px-8 pb-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <BookOpen className="h-6 w-6 text-emerald-600" />
              <span className="text-xl text-emerald-800 font-bold">TODOS OS TÓPICOS MARCADOS PARA REVISÃO!</span>
              <BookOpen className="h-6 w-6 text-emerald-600" />
            </div>
            
            <div className="bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-100 p-6 rounded-xl border-2 border-emerald-300 shadow-inner">
              <p className="text-emerald-900 font-semibold text-xl leading-relaxed mb-4">
                🌟 <strong>Conquista Épica Desbloqueada!</strong> 🌟
              </p>
              <p className="text-emerald-800 text-lg leading-relaxed">
                Você alcançou um marco extraordinário na sua jornada de estudos! 
                <strong className="text-emerald-900"> Todos os seus tópicos passaram da fase inicial de aprendizado 
                e agora estão oficialmente em processo de revisão programada!</strong>
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-purple-100 p-5 rounded-lg border border-purple-300">
              <p className="text-purple-800 font-medium leading-relaxed">
                ⭐ <strong>O que isso significa?</strong> Você completou a fase mais desafiadora dos estudos! 
                Agora é hora de solidificar todo esse conhecimento através das revisões estratégicas programadas.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 p-5 rounded-lg border border-yellow-300">
              <p className="text-amber-800 font-medium leading-relaxed">
                🚀 <strong>Próximo nível:</strong> Continue com as revisões para dominar completamente 
                todo o conteúdo e garantir retenção de longo prazo!
              </p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="pt-4"
          >
            <Button 
              onClick={() => navigate('/revisoes')}
              className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 text-white font-bold py-4 px-8 text-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <Trophy className="h-6 w-6 mr-3" />
              Continuar com as Revisões
              <ArrowRight className="h-6 w-6 ml-3" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-emerald-700 text-sm font-medium"
          >
            🎯 Você está no caminho certo! As revisões são a chave para a maestria completa! 📚✨
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AllTopicsInReviewMessage;
