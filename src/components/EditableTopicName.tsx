import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditableTopicNameProps {
  topicId: string;
  initialName: string;
  onUpdate: () => void;
  isEditing?: boolean;
  onEditChange?: (isEditing: boolean) => void;
}

export const EditableTopicName: React.FC<EditableTopicNameProps> = ({
  topicId,
  initialName,
  onUpdate,
  isEditing = false,
  onEditChange
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditingState = isEditing || internalEditing;

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (isEditing) {
      setInternalEditing(true);
    } else {
      setInternalEditing(false);
    }
  }, [isEditing]);

  // Focar no textarea quando entrar em modo de edição
  useEffect(() => {
    if (isEditingState && textareaRef.current) {
      // Usar setTimeout para garantir que o DOM foi atualizado
      setTimeout(() => {
        textareaRef.current?.focus();
        // Colocar cursor no final do texto
        const length = textareaRef.current?.value.length || 0;
        textareaRef.current?.setSelectionRange(length, length);
      }, 0);
    }
  }, [isEditingState]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do tópico não pode estar vazio");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('topics')
        .update({ name: name.trim() })
        .eq('id', topicId);

      if (error) throw error;

      setInternalEditing(false);
      onEditChange?.(false);
      onUpdate();
      
      // Disparar evento para sincronizar outras páginas
      // Evento disparado para sincronização
      window.dispatchEvent(new CustomEvent('topicUpdated', { 
        detail: { action: 'update', topicId } 
      }));
      
      toast.success("Nome do tópico atualizado com sucesso");
    } catch (error) {
      console.error('Erro ao atualizar nome do tópico:', error);
      toast.error("Erro ao atualizar nome do tópico");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(initialName);
    setInternalEditing(false);
    onEditChange?.(false);
  };

  if (isEditingState) {
    return (
      <div className="flex items-start gap-2 flex-1">
        <textarea
          ref={textareaRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-sm font-normal bg-white dark:bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Salvar (Ctrl+Enter)"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Cancelar (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <h3 className="text-sm font-normal text-zinc-800 dark:text-zinc-200 break-words leading-tight">
      {name}
    </h3>
  );
};