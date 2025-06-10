
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Subject } from '@/types';

interface NextSubjectsProps {
  nextSubjects: Subject[];
}

const NextSubjects: React.FC<NextSubjectsProps> = ({ nextSubjects }) => {
  // CORREÇÃO: Não mostrar nada se não há próximas matérias
  if (nextSubjects.length === 0) return null;

  // CORREÇÃO: Garantir que as matérias estão ordenadas por prioridade E filtradas corretamente
  const sortedSubjects = [...nextSubjects]
    .filter(subject => subject.status !== 'Concluída') // Garantir que matérias concluídas não aparecem
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));

  // Se após o filtro não há matérias, não renderizar
  if (sortedSubjects.length === 0) return null;

  return (
    <>
      <h2 className="text-lg font-bold mb-2 flex items-center">
        <ArrowRight className="mr-2 h-4 w-4" />
        Próximas Disciplinas
      </h2>
      <div className="space-y-1">
        {sortedSubjects.map(subject => (
          <motion.div
            key={subject.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full"
          >
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-all w-full">
              <CardContent className="p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-app-blue" />
                  <h3 className="font-medium text-sm">{subject.name}</h3>
                  <p className="text-xs text-gray-500">{subject.topics.length} tópicos</p>
                  {subject.priority && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      #{subject.priority}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  );
};

export default NextSubjects;
