import React, { useState, useEffect, useCallback } from 'react';
import type { Subject, Topic, SubTopic } from '../types';
import { Difficulty } from '../types';
import {
  CloseIcon,
  SaveIcon,
  NotesIcon,
  DifficultyIcon,
  SubtopicsIcon,
  ThumbsUpIcon,
  MinusIcon,
  ThumbsDownIcon,
  PlusIcon,
  TrashIcon,
} from './Icons';

interface NotesModalProps {
  subject: Subject;
  topic: Topic;
  onClose: () => void;
  onSave: (subjectId: string, topicId: string, updatedData: Partial<Omit<Topic, 'id' | 'name' | 'reviewStatus'>>) => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ subject, topic, onClose, onSave }) => {
  const [notes, setNotes] = useState(topic.notes ?? '');
  const [difficulty, setDifficulty] = useState(topic.difficulty ?? Difficulty.MEDIUM);
  const [subTopics, setSubTopics] = useState<SubTopic[]>(topic.subTopics ?? []);
  const [newSubTopic, setNewSubTopic] = useState('');

  const handleSave = () => {
    onSave(subject.id, topic.id, { notes, difficulty, subTopics });
  };

  const handleAddSubTopic = () => {
    if (newSubTopic.trim()) {
      setSubTopics([...subTopics, { id: crypto.randomUUID(), name: newSubTopic.trim() }]);
      setNewSubTopic('');
    }
  };

  const handleRemoveSubTopic = (id: string) => {
    setSubTopics(subTopics.filter(st => st.id !== id));
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const difficultyConfig = {
    [Difficulty.EASY]: { text: 'Fácil', icon: <ThumbsUpIcon />, selectedClasses: 'bg-green-500 text-white' },
    [Difficulty.MEDIUM]: { text: 'Médio', icon: <MinusIcon />, selectedClasses: 'bg-amber-400 text-slate-900' },
    [Difficulty.HARD]: { text: 'Difícil', icon: <ThumbsDownIcon />, selectedClasses: 'bg-red-500 text-white' },
  };
  const unselectedDifficultyClasses = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl m-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 id="notes-modal-title" className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Anotações - {topic.name}
            </h2>
            <p className="text-gray-600 dark:text-slate-400">Matéria: {subject.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Fechar modal"
          >
            <CloseIcon />
          </button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Anotações */}
          <div className="p-5 bg-gray-100 dark:bg-slate-900/70 rounded-xl">
            <h3 className="flex items-center gap-3 font-semibold text-gray-800 dark:text-slate-200 mb-3">
              <NotesIcon /> Anotações
            </h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Comece a escrever suas anotações..."
              className="w-full h-32 p-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              aria-label="Campo de anotações"
            ></textarea>
          </div>

          {/* Nível de dificuldade */}
          <div className="p-5 bg-gray-100 dark:bg-slate-900/70 rounded-xl">
            <h3 className="flex items-center gap-3 font-semibold text-gray-800 dark:text-slate-200 mb-4">
              <DifficultyIcon /> Nível de Dificuldade
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(Difficulty).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex items-center justify-center p-3 rounded-lg font-semibold transition-colors duration-200 ${
                    difficulty === level ? difficultyConfig[level].selectedClasses : unselectedDifficultyClasses
                  }`}
                >
                  {difficultyConfig[level].icon} {difficultyConfig[level].text}
                </button>
              ))}
            </div>
          </div>
          
          {/* Subtópicos Estudados */}
          <div className="p-5 bg-gray-100 dark:bg-slate-900/70 rounded-xl">
             <h3 className="flex items-center gap-3 font-semibold text-gray-800 dark:text-slate-200 mb-3">
               <SubtopicsIcon /> Subtópicos Estudados
            </h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubTopic}
                onChange={e => setNewSubTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubTopic()}
                placeholder="Adicionar subtópico..."
                className="flex-grow p-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
              <button
                onClick={handleAddSubTopic}
                className="flex-shrink-0 p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600"
                disabled={!newSubTopic.trim()}
                aria-label="Adicionar subtópico"
              >
                <PlusIcon />
              </button>
            </div>
            <div className="space-y-2">
              {subTopics.length > 0 ? (
                subTopics.map(st => (
                  <div key={st.id} className="flex items-center justify-between bg-white dark:bg-slate-800/70 p-2 rounded-md animate-fade-in">
                    <span className="text-gray-800 dark:text-slate-300">{st.name}</span>
                    <button
                      onClick={() => handleRemoveSubTopic(st.id)}
                      className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-500 transition-colors"
                      aria-label={`Remover subtópico ${st.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-slate-400 py-3">Nenhum subtópico adicionado.</p>
              )}
            </div>
          </div>
        </main>

        <footer className="flex p-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-md hover:shadow-lg"
          >
            <SaveIcon />
            Salvar e Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default NotesModal;
