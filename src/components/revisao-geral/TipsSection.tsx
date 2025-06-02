
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export const TipsSection: React.FC = () => {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <BookOpen className="h-5 w-5" />
            Dicas para Manter o Conhecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Revisão Esporádica:</strong> Mesmo tópicos dominados se beneficiam de revisões ocasionais</li>
            <li>• <strong>Aplicação Prática:</strong> Use o conhecimento adquirido em projetos reais</li>
            <li>• <strong>Ensino:</strong> Explicar para outros é uma excelente forma de manter o conhecimento vivo</li>
            <li>• <strong>Reativação:</strong> Se sentir que precisa revisar, use o botão "Reativar" para voltar ao ciclo de estudos</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
};
