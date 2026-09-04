import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { renameTopic } from '@/services/topicMutationService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

interface EditableTopicNameProps {
  topicId: string;
  initialName: string;
  onUpdate: () => void;
  isEditing?: boolean;
  onEditChange?: (isEditing: boolean) => void;
  searchQuery?: string;
}

// Componente para destacar texto da busca
const HighlightText: React.FC<{ text: string; searchQuery: string }> = ({ text, searchQuery }) => {
  if (!searchQuery.trim()) return <>{text}</>;

  const normalizeText = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(searchQuery);

  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return <>{text}</>;

  const beforeMatch = text.substring(0, index);
  const match = text.substring(index, index + searchQuery.length);
  const afterMatch = text.substring(index + searchQuery.length);

  return (
    <>
      {beforeMatch}
      <mark className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100 px-0.5 rounded">
        {match}
      </mark>
      {afterMatch}
    </>
  );
};

export const EditableTopicName: React.FC<EditableTopicNameProps> = ({
  topicId,
  initialName,
  onUpdate,
  isEditing = false,
  onEditChange,
  searchQuery = ''
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLInputElement>(null);

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
      toastGate.notifyError("Nome do tópico não pode estar vazio", 'COMPONENTS-EDITABLETOPICNAME-01', { severity: 'medium' });
      return;
    }

    setIsSaving(true);
    try {
      await renameTopic(topicId, name.trim());

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
      toastGate.notifyError("Erro ao atualizar nome do tópico", 'COMPONENTS-EDITABLETOPICNAME-02', { severity: 'medium' });
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
          ref={textareaRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            }
            if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          autoFocus
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          title="Salvar (Enter)"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Cancelar (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 break-words block">
      <HighlightText text={name} searchQuery={searchQuery} />
    </span>
  );
};
