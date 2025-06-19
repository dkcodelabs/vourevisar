
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, Link2, Save } from 'lucide-react';
import { TopicNotes } from '@/types';
import { toast } from 'sonner';

interface TopicNotesEditorProps {
  notes?: TopicNotes;
  onSave: (notes: TopicNotes) => Promise<void>;
  isLoading?: boolean;
}

const TopicNotesEditor: React.FC<TopicNotesEditorProps> = ({
  notes,
  onSave,
  isLoading = false
}) => {
  const [title, setTitle] = useState(notes?.title || '');
  const [content, setContent] = useState(notes?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Auto-save com debounce
  useEffect(() => {
    if (!hasChanges) return;

    const timeoutId = setTimeout(async () => {
      if (title || content) {
        await handleSave();
      }
    }, 2000); // 2 segundos de debounce

    return () => clearTimeout(timeoutId);
  }, [title, content, hasChanges]);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const notesToSave: TopicNotes = {
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date().toISOString()
      };

      if (!notes?.createdAt) {
        notesToSave.createdAt = new Date().toISOString();
      } else {
        notesToSave.createdAt = notes.createdAt;
      }

      await onSave(notesToSave);
      setHasChanges(false);
      toast.success('Anotações salvas automaticamente');
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    
    setContent(newText);
    setHasChanges(true);
    
    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <motion.div 
      className="space-y-4 p-4 bg-white/50 rounded-lg border border-gray-200"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header com indicador de salvamento */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Anotações</h4>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Save className="h-3 w-3 animate-spin" />
              Salvando...
            </span>
          )}
          {hasChanges && !isSaving && (
            <span className="text-xs text-orange-600">Não salvo</span>
          )}
        </div>
      </div>

      {/* Campo de título */}
      <Input
        type="text"
        placeholder="Título da anotação..."
        value={title}
        onChange={handleTitleChange}
        className="font-medium text-base border-none bg-transparent p-0 focus:ring-0 placeholder:text-gray-400"
        disabled={isLoading}
      />

      {/* Barra de ferramentas de formatação */}
      <div className="flex items-center gap-1 pb-2 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('**', '**')}
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('*', '*')}
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <Italic className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('- ')}
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <List className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting('[', '](url)')}
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <Link2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Campo de conteúdo */}
      <textarea
        id="content-editor"
        placeholder="Pressione '/' para comandos, ou comece a escrever...

Dicas de formatação:
**negrito** *itálico* 
- Lista com marcadores
1. Lista numerada
[link](url)"
        value={content}
        onChange={handleContentChange}
        disabled={isLoading}
        className="w-full min-h-[200px] p-3 border border-gray-200 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 text-sm leading-relaxed"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
      />

      {/* Preview das anotações quando há conteúdo */}
      {(title || content) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h5 className="text-xs font-medium text-gray-500 mb-2">Preview:</h5>
          {title && <h6 className="font-medium text-sm text-gray-800 mb-1">{title}</h6>}
          {content && (
            <div className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
              {content.length > 100 ? content.substring(0, 100) + '...' : content}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TopicNotesEditor;
