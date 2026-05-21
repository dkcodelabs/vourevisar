
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle } from 'lucide-react';
import { TopicNotes } from '@/types';
import { toast } from '@/lib/toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { toastGate } from '@/lib/errors/toastGate';

/**
 * SECURITY NOTE: Rich Text Editor Safety
 * 
 * This component uses Quill.js for rich text editing. Sanitization is crucial:
 * - Content is stored as HTML in the database.
 * - When rendered back, we use Quill's native API which handles most safety concerns.
 * - IMPORTANT: Always ensure proper sanitization if displaying this HTML outside of this editor.
 * 
 * NOTE: This implementation replaces 'react-quill' to solve the 'findDOMNode' deprecation warning.
 */

interface RichTextNotesEditorProps {
  notes?: TopicNotes;
  onSave: (notes: TopicNotes) => Promise<void>;
  isLoading?: boolean;
  onChange?: (content: string) => void;
  hideHeader?: boolean;
  hideToolbar?: boolean;
  toolbarTopOffset?: number;
}

const RichTextNotesEditor: React.FC<RichTextNotesEditorProps> = ({
  notes,
  onSave,
  isLoading = false,
  onChange,
  hideHeader = false,
  hideToolbar = false,
  toolbarTopOffset = 0
}) => {
  const [content, setContent] = useState(notes?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<Quill | null>(null);
  const isUpdatingRef = useRef(false);

  // Inicializar o Quill
  useEffect(() => {
    if (containerRef.current && !quillInstance.current) {
      // Criar o elemento do editor
      const editorContainer = document.createElement('div');
      containerRef.current.appendChild(editorContainer);

      // Configuração da toolbar
      const modules = {
        toolbar: hideToolbar ? false : [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'background': [] }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['link'],
          ['clean']
        ]
      };

      // Instanciar Quill
      const quill = new Quill(editorContainer, {
        theme: 'snow',
        modules,
        placeholder: 'Comece a escrever suas anotações... Use a barra de ferramentas para formatação.',
        readOnly: isLoading || isSaving
      });

      quillInstance.current = quill;

      // Conteúdo inicial
      if (notes?.content) {
        quill.root.innerHTML = notes.content;
      }

      // Handler de mudanças
      quill.on('text-change', () => {
        if (isUpdatingRef.current) return;
        
        const html = quill.root.innerHTML;
        // Se o conteúdo for apenas um parágrafo vazio (padrão do Quill), tratar como vazio
        const sanitizedHtml = html === '<p><br></p>' ? '' : html;
        setContent(sanitizedHtml);
      });
    }

    return () => {
      // Cleanup: Remover toolbar e editor se necessário
      if (quillInstance.current) {
        const toolbar = containerRef.current?.parentElement?.querySelector('.ql-toolbar');
        if (toolbar) toolbar.remove();
        quillInstance.current = null;
        if (containerRef.current) containerRef.current.innerHTML = '';
      }
    };
  }, []); // Rodar apenas uma vez

  // Atualizar readOnly se o estado de loading mudar
  useEffect(() => {
    if (quillInstance.current) {
      if (isLoading || isSaving) {
        quillInstance.current.disable();
      } else {
        quillInstance.current.enable();
      }
    }
  }, [isLoading, isSaving]);

  // Sincronizar 'hasChanges' e callback 'onChange'
  useEffect(() => {
    const originalContent = notes?.content || '';
    const hasChangesLocal = content !== originalContent;
    setHasChanges(hasChangesLocal);

    if (onChange) {
      onChange(content);
    }
  }, [content, notes?.content, onChange]);

  // Ajustar altura automaticamente
  useEffect(() => {
    const adjustHeight = () => {
      if (containerRef.current) {
        const editorElement = containerRef.current.querySelector('.ql-editor') as HTMLElement;
        if (editorElement) {
          editorElement.style.height = 'auto';
          const minHeight = 60;
          const scrollHeight = editorElement.scrollHeight;
          const newHeight = Math.max(minHeight, scrollHeight + 10);
          editorElement.style.height = `${newHeight}px`;
          
          const containerElement = containerRef.current.querySelector('.ql-container') as HTMLElement;
          if (containerElement) {
            containerElement.style.height = 'auto';
          }
        }
      }
    };

    adjustHeight();
    const timeoutId = setTimeout(adjustHeight, 100);
    return () => clearTimeout(timeoutId);
  }, [content]);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const notesToSave: TopicNotes = {
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
      setLastSaved(new Date());
      toast.success('Anotações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toastGate.notifyError('Erro ao salvar anotações', 'COMPONENTS-RICHTEXTNOTESEDITOR-01', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  const customStyles = `
    .ql-editor {
      min-height: 150px;
      max-height: 50vh;
      overflow-y: auto!important;
      font-size: 14px;
      line-height: 1.6;
      padding: 12px 15px!important;
      resize: vertical;
    }
    .ql-container {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
    }
    .ql-container.ql-snow {
      border: 1px solid #e2e8f0;
    }
    .ql-toolbar {
      border-top: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      background: white;
    }
    .ql-container:not(.ql-toolbar + .ql-container) {
      border-radius: 6px;
    }
    .ql-toolbar + .ql-container {
      border-top: none;
      border-radius: 0 0 6px 6px;
    }
  `;

  return (
    <motion.div
      className={hideHeader ? "space-y-2" : "space-y-4 p-4 bg-white/50 rounded-lg border border-gray-200"}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <style>{customStyles}</style>

      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Anotações</h4>
          <div className="flex items-center gap-3">
            {hasChanges && !isSaving && (
              <span className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Não salvo
              </span>
            )}
            {!hasChanges && lastSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Salvo
              </span>
            )}

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isLoading}
              size="sm"
              className="h-8"
            >
              {isSaving ? (
                <>
                  <Save className="h-3 w-3 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="relative" ref={containerRef}>
        {/* O Quill será injetado aqui via useEffect */}
      </div>

      {!hideHeader && lastSaved && (
        <div className="text-xs text-gray-500 text-right">
          Última modificação: {lastSaved.toLocaleString('pt-BR')}
        </div>
      )}
    </motion.div>
  );
};

export default RichTextNotesEditor;
