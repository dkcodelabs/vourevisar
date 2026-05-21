
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, BarChart3, Sparkles, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import SubjectReactivationModal from './SubjectReactivationModal';

const AllStudiesCompletedMessage: React.FC = () => {
  const navigate = useNavigate();
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const confettiTriggered = useRef(false); // CORRIGIDO: Controle para evitar loop

  useEffect(() => {
    // CORRIGIDO: Evitar loop de confetti
    if (confettiTriggered.current) {
      console.log('🎉 Confetti já foi executado, pulando...');
      return;
    }

    console.log('🎉 Iniciando confetti para conclusão total...');
    confettiTriggered.current = true;

    const duration = 3000; // REDUZIDO: Duração menor
    const animationEnd = Date.now() + duration;
    let intervalId: NodeJS.Timeout | null = null;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const runConfetti = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        console.log('🎉 Confetti finalizado');
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti da esquerda
      confetti({
        particleCount: Math.floor(particleCount),
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
      });

      // Confetti da direita
      confetti({
        particleCount: Math.floor(particleCount),
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
      });
    };

    // CORRIGIDO: Executar imediatamente e depois em intervalos
    runConfetti();
    intervalId = setInterval(runConfetti, 300);

    // CLEANUP: Limpar interval no unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('🎉 Confetti cleanup executado');
      }
    };
  }, []); // CORRIGIDO: Dependências vazias para executar apenas uma vez

  const handleStartNewStudies = () => {
    setShowReactivationModal(true);
  };

  const handleViewGeneralReview = () => {
    navigate('/revisao-geral');
  };

  const handleAddNewSubjects = () => {
    navigate('/ciclo-estudos');
  };

  const handleViewStatistics = () => {
    navigate('/estatisticas');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-4 border-yellow-300 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />

          <CardHeader className="text-center pb-6 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <Trophy className="h-20 w-20 text-yellow-500 drop-shadow-lg" />
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -top-3 -right-3"
                >
                  <Sparkles className="h-8 w-8 text-amber-400" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <CardTitle className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                🎉 PARABÉNS! 🎉
              </CardTitle>
              <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                Você DOMINOU todos os seus estudos!
              </div>
              <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto">
                <strong>Incrível conquista!</strong> Você concluiu todas as matérias e dominou todos os tópicos do seu plano de estudos.
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="text-center space-y-6 pb-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <Button
                onClick={handleStartNewStudies}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-4 text-base h-auto"
                size="lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div>Reativar</div>
                  <div className="text-sm opacity-90">Matérias</div>
                </div>
              </Button>

              <Button
                onClick={handleAddNewSubjects}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-4 text-base h-auto"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div>Adicionar</div>
                  <div className="text-sm opacity-90">Matérias</div>
                </div>
              </Button>

              <Button
                onClick={handleViewGeneralReview}
                variant="outline"
                className="border-2 border-amber-400 text-amber-700 hover:bg-amber-50 font-semibold px-6 py-4 text-base h-auto"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div>Revisão</div>
                  <div className="text-sm opacity-80">Geral</div>
                </div>
              </Button>

              <Button
                onClick={handleViewStatistics}
                variant="outline"
                className="border-2 border-purple-400 text-purple-700 hover:bg-purple-50 font-semibold px-6 py-4 text-base h-auto"
                size="lg"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div>Ver</div>
                  <div className="text-sm opacity-80">Estatísticas</div>
                </div>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-yellow-200"
            >
              <p className="text-sm text-gray-600 italic">
                💡 <strong>Dica:</strong> Continue mantendo o hábito de estudos!
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <SubjectReactivationModal
        isOpen={showReactivationModal}
        onClose={() => setShowReactivationModal(false)}
      />
    </>
  );
};

export default AllStudiesCompletedMessage;
