import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { ProfileSelector } from './ProfileSelector';
import { ReviewProfile } from '../types/study';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface ProfileOnboardingModalProps {
  open: boolean;
  onConfirm: (profile: ReviewProfile) => void;
  onClose?: () => void;
  selectedProfile?: ReviewProfile | null;
  disabled?: boolean;
}

export const ProfileOnboardingModal: React.FC<ProfileOnboardingModalProps> = ({ 
  open, 
  onConfirm, 
  onClose, 
  selectedProfile, 
  disabled 
}) => {
  const [selected, setSelected] = useState<ReviewProfile | null>(selectedProfile ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(selectedProfile ?? null);
  }, [selectedProfile]);

  const handleConfirm = async () => {
    if (!selected || disabled) return;
    setSubmitting(true);
    await onConfirm(selected);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && disabled && onClose) onClose(); }}>
      <DialogContent hideCloseButton={!disabled} className="sm:max-w-[600px]" aria-describedby="onboarding-modal-description">
        {disabled && (
          <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-400">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Você já possui revisões em andamento. O perfil de revisão não pode ser alterado para não comprometer seu progresso.
              <span className="block mt-2 text-sm text-yellow-700">
                Assim que concluir todas as revisões dos seus tópicos, você poderá escolher outro perfil de revisão nas configurações.
              </span>
            </AlertDescription>
          </Alert>
        )}
        
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Bem-vindo ao sistema de revisão inteligente!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Para começar a usar o sistema, você precisa escolher um perfil de revisão.
            Este perfil determinará a frequência e intensidade das suas revisões.
            <span className="block mt-2 text-sm text-gray-500">
              Você poderá alterar depois nas configurações, mas é importante escolher um perfil adequado ao seu momento de estudos.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div id="onboarding-modal-description" className="sr-only">
          Modal de configuração inicial do perfil de revisão. Escolha um perfil que se adeque ao seu ritmo de estudos para começar a usar o sistema.
        </div>

        <div className="my-6">
          <ProfileSelector 
            selected={selected} 
            onSelect={setSelected} 
            onboarding 
            disabled={disabled} 
          />
        </div>

        <DialogFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          {!disabled && (
            <Button
              variant="outline"
              onClick={() => onConfirm(ReviewProfile.INTERMEDIATE)}
              disabled={submitting}
            >
              Usar perfil intermediário
            </Button>
          )}
          
          <Button
            onClick={handleConfirm}
            disabled={!selected || submitting || disabled}
            className="w-full sm:w-auto"
            size="lg"
          >
            {disabled 
              ? 'Perfil já definido' 
              : submitting 
                ? 'Salvando...' 
                : selected 
                  ? 'Confirmar e começar' 
                  : 'Selecione um perfil para continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 