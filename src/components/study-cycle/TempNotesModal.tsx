import React, { useState } from 'react';
import { toast } from 'sonner';

interface TempNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topicId: string;
  topicName: string;
  subjectName: string;
}

const TempNotesModal: React.FC<TempNotesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  topicId,
  topicName,
  subjectName
}) => {
  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState<'facil' | 'medio' | 'dificil' | ''>('');
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [newSubtopic, setNewSubtopic] = useState('');

  const handleSaveAndClose = () => {
    console.log('Salvando anotações temporárias:', {
      topicId,
      topicName,
      notes,
      difficulty,
      subtopics
    });
    
    toast.success('Anotações salvas!');
    onSave();
  };

  const addSubtopic = () => {
    if (newSubtopic.trim() && !subtopics.includes(newSubtopic.trim())) {
      setSubtopics([...subtopics, newSubtopic.trim()]);
      setNewSubtopic('');
    }
  };

  const removeSubtopic = (subtopic: string) => {
    setSubtopics(subtopics.filter(s => s !== subtopic));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Anotações de Revisão
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {subjectName} • {topicName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Anotações */}
          <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Anotações
              </h3>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 bg-background border border-border rounded-lg p-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
              placeholder="Escreva suas anotações sobre este tópico..."
            />
          </div>

          {/* Dificuldade */}
          <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Dificuldade
              </h3>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'facil', label: 'Fácil', icon: '😊', color: 'emerald' },
                { value: 'medio', label: 'Médio', icon: '😐', color: 'amber' },
                { value: 'dificil', label: 'Difícil', icon: '😰', color: 'red' }
              ].map((option) => {
                const isSelected = difficulty === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setDifficulty(option.value as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected 
                        ? `bg-${option.color}-500 text-white border-${option.color}-500` 
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtópicos */}
          <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Subtópicos ({subtopics.length})
              </h3>
            </div>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSubtopic}
                onChange={(e) => setNewSubtopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubtopic()}
                className="flex-grow bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="Adicionar subtópico..."
              />
              <button
                onClick={addSubtopic}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-colors"
              >
                Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {subtopics.map((subtopic, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                >
                  {subtopic}
                  <button
                    onClick={() => removeSubtopic(subtopic)}
                    className="ml-1 text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            {subtopics.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                Nenhum subtópico adicionado
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSaveAndClose}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export { TempNotesModal };
export default TempNotesModal;