import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const actionAlertVariants = cva(
  'flex w-full flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center',
  {
    variants: {
      variant: {
        warning:
          'border-warning/45 bg-warning/[0.09] text-amber-950 dark:border-warning/40 dark:bg-warning/[0.10] dark:text-amber-100',
        info:
          'border-info/35 bg-info/[0.08] text-sky-950 dark:border-info/30 dark:bg-info/[0.10] dark:text-sky-100',
        success:
          'border-success/35 bg-success/[0.08] text-emerald-950 dark:border-success/30 dark:bg-success/[0.10] dark:text-emerald-100',
        destructive:
          'border-destructive/35 bg-destructive/[0.08] text-red-950 dark:border-destructive/30 dark:bg-destructive/[0.10] dark:text-red-100',
      },
    },
    defaultVariants: {
      variant: 'warning',
    },
  },
);

const iconVariants = cva(
  'flex size-8 shrink-0 items-center justify-center rounded-full',
  {
    variants: {
      variant: {
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        success: 'bg-success text-success-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'warning',
    },
  },
);

const actionVariants = cva(
  'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-bold underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        warning: 'text-amber-800 dark:text-amber-300',
        info: 'text-sky-700 dark:text-sky-300',
        success: 'text-emerald-700 dark:text-emerald-300',
        destructive: 'text-red-700 dark:text-red-300',
      },
    },
    defaultVariants: {
      variant: 'warning',
    },
  },
);

const defaultIcons: Record<NonNullable<ActionAlertProps['variant']>, LucideIcon> = {
  warning: CircleAlert,
  info: Info,
  success: CircleCheck,
  destructive: TriangleAlert,
};

export interface ActionAlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof actionAlertVariants> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
  onAction?: React.MouseEventHandler<HTMLButtonElement>;
}

export const ActionAlert = React.forwardRef<HTMLDivElement, ActionAlertProps>(
  (
    {
      className,
      variant = 'warning',
      title,
      description,
      icon: Icon = defaultIcons[variant ?? 'warning'],
      actionLabel,
      actionHref,
      actionIcon: ActionIcon = ArrowUpRight,
      onAction,
      ...props
    },
    ref,
  ) => {
    const actionClassName = cn(actionVariants({ variant }), 'self-start sm:self-auto');
    const actionContent = actionLabel ? (
      <>
        <span>{actionLabel}</span>
        <ActionIcon aria-hidden="true" className="size-4" />
      </>
    ) : null;

    return (
      <div
        ref={ref}
        role={variant === 'destructive' ? 'alert' : 'status'}
        className={cn(actionAlertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className={iconVariants({ variant })} aria-hidden="true">
            <Icon className="size-4" strokeWidth={2.5} />
          </span>

          <div className="min-w-0 py-1">
            <p className="font-semibold leading-5">{title}</p>
            {description ? (
              <div className="mt-0.5 text-xs font-medium leading-5 opacity-80">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {actionContent && actionHref ? (
          <a className={actionClassName} href={actionHref}>
            {actionContent}
          </a>
        ) : null}

        {actionContent && !actionHref && onAction ? (
          <button className={actionClassName} type="button" onClick={onAction}>
            {actionContent}
          </button>
        ) : null}
      </div>
    );
  },
);

ActionAlert.displayName = 'ActionAlert';
