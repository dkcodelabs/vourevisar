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

interface CompactMergeSuggestionItemProps {
  suggestion: PendingSuggestion;
  onApprove: (suggestion: PendingSuggestion) => Promise<void>;
  onReject: (suggestion: PendingSuggestion) => Promise<void>;
  disabled?: boolean;
}

export function CompactMergeSuggestionItem({
  suggestion,
  onApprove,
  onReject,
  disabled = false,
}: CompactMergeSuggestionItemProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const originalNames = (suggestion.original_names as string[] | undefined) || [];

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles size={10} className="text-amber-500" />
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80">Sugestão IA</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[9px] font-black text-content-muted/60 uppercase shrink-0">DE:</span>
            <span className="text-[10px] text-content-muted truncate font-medium">
              {originalNames.join(' e ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[9px] font-black text-amber-500 uppercase shrink-0">PARA:</span>
            <span className="text-xs font-bold text-foreground truncate tracking-tight">
              {suggestion.suggested_name}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setLoading('reject');
            onReject(suggestion).finally(() => setLoading(null));
          }}
          disabled={disabled || loading !== null}
          className="w-8 h-8 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
          title="Manter Separado"
        >
          {loading === 'reject' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={16} />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setLoading('approve');
            onApprove(suggestion).finally(() => setLoading(null));
          }}
          disabled={disabled || loading !== null}
          className="w-8 h-8 p-0 rounded-lg text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
          title="Unificar"
        >
          {loading === 'approve' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
        </Button>
      </div>
    </div>
  );
}

interface CompactMergeSuggestionListProps {
  suggestions: PendingSuggestion[];
  onApprove: (suggestion: PendingSuggestion) => Promise<void>;
  onReject: (suggestion: PendingSuggestion) => Promise<void>;
  disabled?: boolean;
}

export function CompactMergeSuggestionList({
  suggestions,
  onApprove,
  onReject,
  disabled = false,
}: CompactMergeSuggestionListProps) {
  if (!suggestions.length) {
    return (
      <div className="py-10 text-center space-y-2">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check size={20} className="text-emerald-500/60" />
        </div>
        <p className="text-sm font-bold text-foreground/80">Tudo unificado!</p>
        <p className="text-xs text-content-muted">Não há mais sugestões pendentes para este edital.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {suggestions.map((suggestion) => (
        <CompactMergeSuggestionItem
          key={suggestion.id}
          suggestion={suggestion}
          onApprove={onApprove}
          onReject={onReject}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
