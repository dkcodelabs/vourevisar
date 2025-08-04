
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight } from 'lucide-react';

interface StudyPlanHeaderProps {
  onNextDay: () => void;
}

const StudyPlanHeader: React.FC<StudyPlanHeaderProps> = ({ onNextDay }) => {
  return (
    <motion.div 
      className="flex flex-col md:flex-row md:items-center md:justify-between bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 gap-2"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="flex items-center gap-2">
        <GraduationCap size={24} className="text-app-blue" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-app-blue to-purple-600 bg-clip-text text-transparent">
          Plano de Estudo Diário
        </h1>
      </div>
      
      
    </motion.div>
    
  );
};

export default StudyPlanHeader;
