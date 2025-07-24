import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReviewConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  topicName: string;
  isLoading?: boolean;
}

export const ReviewConfirmDialog: React.FC<ReviewConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  topicName,
  isLoading = false
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent aria-describedby="confirm-review-dialog-description">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar revisão</AlertDialogTitle>
          <AlertDialogDescription id="confirm-review-dialog-description">
            Tem certeza que deseja marcar o tópico <strong>"{topicName}"</strong> como revisado?
            <br />
            <br />
            Esta ação irá atualizar o cronograma de revisões e não pode ser desfeita facilmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Marcando...' : 'Sim, revisei'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};