import { motion, useReducedMotion } from 'framer-motion';
import { Building2, Check, ReceiptText } from 'lucide-react';

type RefundProgressStatus = 'pending' | 'succeeded' | 'attention';

interface RefundStatusProgressProps {
  status: RefundProgressStatus;
}

const steps = [
  { label: 'Pedido recebido', Icon: ReceiptText },
  { label: 'Stripe confirmou', Icon: Check },
  { label: 'Banco e cartão', Icon: Building2 },
];

const completedStepByStatus: Record<RefundProgressStatus, number> = {
  pending: 0,
  succeeded: 1,
  attention: 0,
};

export const RefundStatusProgress = ({ status }: RefundStatusProgressProps) => {
  const reduceMotion = useReducedMotion();
  const completedStep = completedStepByStatus[status];

  return (
    <ol aria-label="Andamento do reembolso" className="mt-5 flex items-start">
      {steps.map(({ label, Icon }, index) => {
        const isCompleted = index <= completedStep;
        const isCurrent = index === completedStep && status !== 'attention';

        return (
          <li key={label} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <motion.span
                initial={false}
                animate={reduceMotion || !isCurrent ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs ${
                  isCompleted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </motion.span>
              <span className={`max-w-[5.6rem] text-[10px] font-bold leading-3 ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`mt-[1.05rem] h-px min-w-3 flex-1 ${index < completedStep ? 'bg-primary' : 'bg-border'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
