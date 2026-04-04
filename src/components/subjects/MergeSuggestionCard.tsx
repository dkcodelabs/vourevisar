import { useState } from 'react';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingSuggestion } from '@/services/cycleMergeService';

interface MergeSuggestionCardProps {
  suggestion: PendingSuggestion;
  onApprove: (suggestion: PendingSuggestion) => Promise<void>;
  onReject: (suggestion: PendingSuggestion) => Promise<void>;
  disabled?: boolean;
}

export function MergeSuggestionCard({
  suggestion,
  onApprove,
  onReject,
  disabled = false,
}: MergeSuggestionCardProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const originalNames = (suggestion.original_names as string[] | undefined) || [];

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await onApprove(suggestion);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await onReject(suggestion);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-secondary/50 dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-amber-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          Sugestão de Unificação (IA)
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-[9px] text-content-muted uppercase tracking-wider">Unificar para:</span>
          <p className="text-sm font-semibold text-foreground">{suggestion.suggested_name}</p>
        </div>

        <div>
          <span className="text-[9px] text-content-muted uppercase tracking-wider">Tópicos originais:</span>
          <ul className="mt-1 space-y-1">
            {originalNames.map((name, idx) => (
              <li
                key={idx}
                className="text-xs text-foreground/70 pl-3 border-l-2 border-border dark:border-white/10"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={disabled || loading !== null}
          className="flex-1 h-9 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
        >
          {loading === 'reject' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <X size={14} className="mr-1" />
              Manter Separado
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={disabled || loading !== null}
          className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {loading === 'approve' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Check size={14} className="mr-1" />
              Unificar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface MergeSuggestionsListProps {
  suggestions: PendingSuggestion[];
  onApprove: (suggestion: PendingSuggestion) => Promise<void>;
  onReject: (suggestion: PendingSuggestion) => Promise<void>;
  disabled?: boolean;
}

export function MergeSuggestionsList({
  suggestions,
  onApprove,
  onReject,
  disabled = false,
}: MergeSuggestionsListProps) {
  if (!suggestions.length) {
    return (
      <div className="p-8 text-center rounded-2xl bg-secondary/30 dark:bg-zinc-800/20 border border-border dark:border-white/5">
        <Check size={32} className="mx-auto mb-2 text-emerald-500/50" />
        <p className="text-sm text-content-muted">Nenhuma sugestão pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-content-muted">
          {suggestions.length} sugestão{suggestions.length !== 1 ? 's' : ''} pendente{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {suggestions.map((suggestion) => (
          <MergeSuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onApprove={onApprove}
            onReject={onReject}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
