
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditableTopicNameProps {
  topicId: string;
  initialName: string;
  onUpdate: () => void;
}

export const EditableTopicName: React.FC<EditableTopicNameProps> = ({
  topicId,
  initialName,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

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

      setIsEditing(false);
      onUpdate();
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
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm"
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
    <div className="flex items-center gap-2 flex-1 group">
      <span className="text-sm font-medium text-gray-800 flex-1">{name}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
