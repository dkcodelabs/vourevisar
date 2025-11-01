import React, { useState, useEffect } from 'react';
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

  const isEditingState = isEditing || internalEditing;

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (isEditing) {
      setInternalEditing(true);
    }
  }, [isEditing]);

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
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-base font-normal"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <h3 className="text-base font-normal text-zinc-800 dark:text-zinc-200 truncate">
      {name}
    </h3>
  );
};