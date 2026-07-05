import { CalendarDays, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CycleExamDateDialogProps = {
  errorMessage: string | null;
  examDate: string;
  isOpen: boolean;
  isSaving: boolean;
  onExamDateChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<boolean> | void;
};

export function CycleExamDateDialog({
  errorMessage,
  examDate,
  isOpen,
  isSaving,
  onExamDateChange,
  onOpenChange,
  onSave,
}: CycleExamDateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg md:max-w-md lg:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle>Data da prova do ciclo</DialogTitle>
          <DialogDescription>
            Esta data orienta o ritmo do ciclo e não altera as datas dos editais individuais.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cycle-exam-date">Data da prova do ciclo</Label>
            <Input
              id="cycle-exam-date"
              type="date"
              value={examDate}
              onChange={(event) => onExamDateChange(event.target.value)}
              disabled={isSaving}
            />
            <p className="text-xs text-content-muted">
              Deixe vazio para manter o ciclo sem uma data definida.
            </p>
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} aria-label={isSaving ? 'Salvando data' : 'Salvar data'}>
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isSaving ? 'Salvando' : 'Salvar data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
