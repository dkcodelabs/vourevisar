import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { StudyCycleSubject, StudyCycleTopic, SubTopic } from '@/types/study-cycle';
import { Difficulty } from '@/types/study-cycle';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { toast } from 'sonner';
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

interface StudyCycleNotesModalProps {
  subject: StudyCycleSubject;
  topic: StudyCycleTopic;
  onClose: () => void;
  onSave: (subjectId: string, topicId: string, updatedData: Partial<Omit<StudyCycleTopic, 'id' | 'name' | 'reviewStatus'>>) => void;
}

export const StudyCycleNotesModal: React.FC<StudyCycleNotesModalProps> = ({ subject, topic, onClose, onSave }) => {
  const [notes, setNotes] = useState(topic.notes ?? '');
  const [difficulty, setDifficulty] = useState(topic.difficulty ?? Difficulty.MEDIUM);
  const [subTopics, setSubTopics] = useState<SubTopic[]>(topic.subTopics ?? []);
  const [newSubTopic, setNewSubTopic] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftWarning, setShowDraftWarning] = useState(false);
  const quillRef = useRef<ReactQuill>(null);
  
  // Hook para persistência de drafts
  const { hasDraft, draftData, autoSaveDraft, clearDraft } = useDraftPersistence(topic.id, subject.id);

  // Carregar draft se existir
  useEffect(() => {
    if (hasDraft && draftData) {
      setShowDraftWarning(true);
    }
  }, [hasDraft, draftData]);

  // Auto-save com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (hasUnsavedChanges) {
        autoSaveDraft({
          notes,
          difficulty,
          subTopics
        });
      }
    }, 2000); // Auto-save após 2 segundos de inatividade

    return () => clearTimeout(timeoutId);
  }, [notes, difficulty, subTopics, hasUnsavedChanges, autoSaveDraft]);

  // Detectar mudanças
  useEffect(() => {
    const originalNotes = topic.notes ?? '';
    const originalDifficulty = topic.difficulty ?? Difficulty.MEDIUM;
    const originalSubTopics = topic.subTopics ?? [];
    
    const hasChanges = 
      notes !== originalNotes ||
      difficulty !== originalDifficulty ||
      JSON.stringify(subTopics) !== JSON.stringify(originalSubTopics);
    
    setHasUnsavedChanges(hasChanges);
  }, [notes, difficulty, subTopics, topic]);

  const handleSave = () => {
    onSave(subject.id, topic.id, { notes, difficulty, subTopics });
    clearDraft(); // Limpar draft após salvar
    setHasUnsavedChanges(false);
  };

  const handleLoadDraft = () => {
    if (draftData) {
      setNotes(draftData.notes);
      if (draftData.difficulty) {
        setDifficulty(draftData.difficulty as Difficulty);
      }
      if (draftData.subTopics) {
        setSubTopics(draftData.subTopics);
      }
      setShowDraftWarning(false);
      toast.success('Rascunho carregado!');
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftWarning(false);
    toast.info('Rascunho descartado');
  };

  const handleAddSubTopic = () => {
    if (newSubTopic.trim()) {
      setSubTopics([...subTopics, { id: crypto.randomUUID(), name: newSubTopic.trim() }]);
      setNewSubTopic('');
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSubTopic = (id: string) => {
    setSubTopics(subTopics.filter(st => st.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasUnsavedChanges(true);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setHasUnsavedChanges(true);
  };
  
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'Você tem alterações não salvas. Elas serão salvas automaticamente como rascunho. Deseja continuar?'
      );
      if (confirmClose) {
        // Auto-save antes de fechar
        autoSaveDraft({
          notes,
          difficulty,
          subTopics
        });
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, notes, difficulty, subTopics, autoSaveDraft, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);
  
  useEffect(() => {
    // Adicionar classe para prevenir scroll do body
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      // Remover classe ao desmontar o componente
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const difficultyConfig = {
    [Difficulty.EASY]: { text: 'Fácil', icon: <ThumbsUpIcon />, selectedClasses: 'bg-green-500 text-white' },
    [Difficulty.MEDIUM]: { text: 'Médio', icon: <MinusIcon />, selectedClasses: 'bg-amber-400 text-slate-900' },
    [Difficulty.HARD]: { text: 'Difícil', icon: <ThumbsDownIcon />, selectedClasses: 'bg-red-500 text-white' },
  };
  const unselectedDifficultyClasses = "bg-slate-700 text-slate-300 hover:bg-slate-600";

  return (
    <>
      <style>{`
        /* Modal Overlay - Garantir que apareça por cima de tudo */
        .modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(4px) !important;
        }
        
        /* Modal Content */
        .modal-content {
          position: relative !important;
          z-index: 10000 !important;
          max-height: 90vh !important;
          width: 100% !important;
          max-width: 42rem !important;
          margin: 1rem !important;
          background: white !important;
          border-radius: 1rem !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          display: flex !important;
          flex-direction: column !important;
          animation: modalFadeIn 0.3s ease-out !important;
        }
        
        .dark .modal-content {
          background: #1e293b !important;
        }
        
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Garantir que o body não tenha scroll quando modal estiver aberto */
        body.modal-open {
          overflow: hidden !important;
        }
        /* ReactQuill Container */
        .ql-container {
          height: 158px !important;
          border: 1px solid #cbd5e1 !important;
          border-top: none !important;
          border-radius: 0 0 6px 6px !important;
          background: white !important;
        }
        
        .dark .ql-container {
          border-color: #475569 !important;
          background: #334155 !important;
        }
        
        /* ReactQuill Toolbar */
        .ql-toolbar {
          border: 1px solid #cbd5e1 !important;
          border-bottom: none !important;
          border-radius: 6px 6px 0 0 !important;
          height: 42px;
          background: #f8fafc !important;
        }
        
        .dark .ql-toolbar {
          border-color: #475569 !important;
          background: #475569 !important;
        }
        
        /* Editor */
        .ql-editor {
          height: 158px !important;
          max-height: 158px !important;
          min-height: 158px !important;
          font-size: 14px;
          line-height: 1.6;
          overflow-y: auto !important;
          padding: 12px 15px !important;
          color: #1e293b !important;
        }
        
        .dark .ql-editor {
          color: #f1f5f9 !important;
        }
        
        /* Toolbar icons - Dark mode */
        .dark .ql-toolbar .ql-stroke {
          stroke: #f1f5f9 !important;
        }
        
        .dark .ql-toolbar .ql-fill {
          fill: #f1f5f9 !important;
        }
        
        .dark .ql-toolbar .ql-picker-label {
          color: #f1f5f9 !important;
        }
        
        .dark .ql-toolbar .ql-picker-options {
          background: #334155 !important;
          border: 1px solid #475569 !important;
        }
        
        .dark .ql-toolbar .ql-picker-item {
          color: #f1f5f9 !important;
        }
        
        .dark .ql-toolbar .ql-picker-item:hover {
          background: #475569 !important;
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-modal-title"
        className="modal-overlay"
        onClick={handleClose}
      >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 id="notes-modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Anotações - {topic.name}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Matéria: {subject.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Fechar modal"
          >
            <CloseIcon />
          </button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Aviso de Draft Disponível */}
          {showDraftWarning && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-amber-600 dark:text-amber-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      Rascunho encontrado
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Você tem alterações não salvas desta anotação. Deseja carregá-las?
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLoadDraft}
                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
                  >
                    Carregar
                  </button>
                  <button
                    onClick={handleDiscardDraft}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Anotações */}
          <div className="p-5 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <h3 className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-200 mb-3">
              <NotesIcon /> Anotações
            </h3>
            <div className="bg-white dark:bg-slate-700 rounded-lg">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={notes}
                onChange={handleNotesChange}
                className="h-full"
                style={{ height: '200px' }}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'background': [] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                  ]
                }}
                formats={[
                  'header',
                  'bold', 'italic', 'underline', 'strike',
                  'background',
                  'list', 'bullet',
                  'link'
                ]}
                placeholder="Comece a escrever suas anotações... Use a barra de ferramentas para formatação."
              />
            </div>
          </div>

          {/* Nível de dificuldade */}
          <div className="p-5 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <h3 className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-200 mb-4">
              <DifficultyIcon /> Nível de Dificuldade
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(Difficulty).map(level => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
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
          <div className="p-5 bg-slate-100 dark:bg-slate-900 rounded-xl">
             <h3 className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-200 mb-3">
               <SubtopicsIcon /> Subtópicos Estudados
            </h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubTopic}
                onChange={e => setNewSubTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubTopic()}
                placeholder="Adicionar subtópico..."
                className="flex-grow p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
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
                    <span className="text-slate-700 dark:text-slate-300">{st.name}</span>
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
                <p className="text-center text-slate-500 dark:text-slate-400 py-3">Nenhum subtópico adicionado.</p>
              )}
            </div>
          </div>
        </main>

        <footer className="flex flex-col p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          {/* Indicador de mudanças não salvas */}
          {hasUnsavedChanges && (
            <div className="flex items-center justify-center gap-2 mb-3 text-sm text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span>Alterações não salvas - Auto-salvando...</span>
            </div>
          )}
          
          <button
            onClick={handleSave}
            className={`w-full flex items-center justify-center py-3 font-bold rounded-lg transition-colors shadow-md hover:shadow-lg ${
              hasUnsavedChanges 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            <SaveIcon />
            {hasUnsavedChanges ? 'Salvar Alterações e Fechar' : 'Salvar e Fechar'}
          </button>
        </footer>
      </div>
    </div>
    </>
  );
};