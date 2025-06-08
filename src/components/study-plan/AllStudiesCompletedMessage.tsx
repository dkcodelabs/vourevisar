
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, BarChart3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import SubjectReactivationModal from './SubjectReactivationModal';

interface AllStudiesCompletedMessageProps {
  // Removemos a prop onHide pois a mensagem deve ficar sempre visível
}

const AllStudiesCompletedMessage: React.FC<AllStudiesCompletedMessageProps> = () => {
  const navigate = useNavigate();
  const [showReactivationModal, setShowReactivationModal] = useState(false);

  useEffect(() => {
    // Confetti especial para conclusão total
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        }
      });
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleStartNewStudies = () => {
    setShowReactivationModal(true);
  };

  const handleViewGeneralReview = () => {
    navigate('/revisao-geral');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-2 border-yellow-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <Trophy className="h-16 w-16 text-yellow-500" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
                🎉 PARABÉNS! 🎉
              </CardTitle>
              <div className="text-xl font-semibold text-gray-800 mb-2">
                Você dominou TODOS os seus estudos!
              </div>
              <p className="text-gray-700 text-base leading-relaxed">
                Incrível! Você concluiu todas as matérias e tópicos do seu plano de estudos. 
                Agora você pode iniciar novos estudos ou revisar suas conquistas.
              </p>
            </motion.div>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                onClick={handleStartNewStudies}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-6 py-3 text-base"
                size="lg"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Iniciar Novos Estudos
              </Button>
              
              <Button
                onClick={handleViewGeneralReview}
                variant="outline"
                className="border-2 border-amber-300 text-amber-700 hover:bg-amber-50 font-medium px-6 py-3 text-base"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Ver Revisão Geral
              </Button>
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
