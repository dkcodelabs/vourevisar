
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle } from 'lucide-react';
import { TopicNotes } from '@/types';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextNotesEditorProps {
  notes?: TopicNotes;
  onSave: (notes: TopicNotes) => Promise<void>;
  isLoading?: boolean;
  onChange?: () => void;
}

const RichTextNotesEditor: React.FC<RichTextNotesEditorProps> = ({
  notes,
  onSave,
  isLoading = false,
  onChange
}) => {
  const [content, setContent] = useState(notes?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const quillRef = useRef<ReactQuill>(null);

  // Detectar mudanças no conteúdo
  useEffect(() => {
    const originalContent = notes?.content || '';
    const hasChanges = content !== originalContent;
    setHasChanges(hasChanges);
    
    // Chamar callback quando houver mudanças
    if (hasChanges && onChange) {
      onChange();
    }
  }, [content, notes?.content, onChange]);

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
      toast.error('Erro ao salvar anotações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
  };

  // Configuração da toolbar do Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'background': [] }], // highlight
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'background',
    'list', 'bullet',
    'link'
  ];

  // Estilo customizado para o highlight amarelo
  const customStyles = `
    .ql-editor {
      min-height: 200px;
      font-size: 14px;
      line-height: 1.6;
    }
    .ql-toolbar {
      border-top: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: none;
      border-radius: 6px 6px 0 0;
    }
    .ql-container {
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 6px 6px;
    }
    .ql-editor.ql-blank::before {
      color: #9ca3af;
      font-style: normal;
      content: 'Comece a escrever suas anotações... Use a barra de ferramentas para formatação.';
    }
  `;

  return (
    <motion.div 
      className="space-y-4 p-4 bg-white/50 rounded-lg border border-gray-200"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <style>{customStyles}</style>
      
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Anotações</h4>
        <div className="flex items-center gap-3">
          {/* Status das mudanças */}
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
          
          {/* Botão salvar */}
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

      {/* Editor de texto rico */}
      <div className="relative">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleContentChange}
          modules={modules}
          formats={formats}
          readOnly={isLoading || isSaving}
          className="bg-white"
        />
      </div>

      {/* Informações adicionais */}
      {lastSaved && (
        <div className="text-xs text-gray-500 text-right">
          Última modificação: {lastSaved.toLocaleString('pt-BR')}
        </div>
      )}
    </motion.div>
  );
};

export default RichTextNotesEditor;
