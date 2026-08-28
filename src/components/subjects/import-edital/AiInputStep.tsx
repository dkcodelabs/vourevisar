import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Database, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { AiSourceStep, type AiSourceMode } from './AiSourceStep';
import { AiOptionalContext } from './AiOptionalContext';
import type { UserAiLimits } from './useAiEditalExtraction';

interface AiInputStepProps {
    aiLimits: UserAiLimits | null;
    iaErrorMessage: string;
    getAiErrorHeading: () => string;
    onClearErrorMessage: () => void;
    aiSourceMode: AiSourceMode;
    onSourceModeChange: (mode: AiSourceMode) => void;
    pdfFiles: File[];
    inputText: string;
    onInputTextChange: (text: string) => void;
    onSelectFiles: () => void;
    onRemoveFile: (index: number) => void;
    onAnalyze: () => void;
    showOptionalContext: boolean;
    onToggleOptionalContext: (open: boolean) => void;
    iaBanca: string;
    onBancaChange: (banca: string) => void;
    iaOrigin: string;
    onOriginChange: (origin: string) => void;
    iaPosition: string;
    onCargoChange: (cargo: string) => void;
    onSwitchToReady: () => void;
    onSwitchToManual: () => void;
    onCloseModal: () => void;
}

export const AiInputStep: React.FC<AiInputStepProps> = ({
    aiLimits,
    iaErrorMessage,
    getAiErrorHeading,
    onClearErrorMessage,
    aiSourceMode,
    onSourceModeChange,
    pdfFiles,
    inputText,
    onInputTextChange,
    onSelectFiles,
    onRemoveFile,
    onAnalyze,
    showOptionalContext,
    onToggleOptionalContext,
    iaBanca,
    onBancaChange,
    iaOrigin,
    onOriginChange,
    iaPosition,
    onCargoChange,
    onSwitchToReady,
    onSwitchToManual,
    onCloseModal,
}) => {
    const navigate = useNavigate();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
                {aiLimits && !aiLimits.can_import && !aiLimits.has_bypass ? (
                    <div className="mx-auto my-4 w-full max-w-[620px] rounded-2xl border border-border bg-card p-5 text-center shadow-xl dark:border-white/5 dark:bg-zinc-900/30 sm:p-6">
                        <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                            <Sparkles size={24} className="text-primary" />
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-card">
                                <X size={10} strokeWidth={3} />
                            </div>
                        </div>
                        <h3 className="mb-2 text-lg font-black tracking-tight text-foreground sm:text-xl">
                            Limite de Importações por IA Atingido
                        </h3>
                        <p className="mx-auto mb-5 max-w-md text-sm font-medium leading-relaxed text-content-muted">
                            {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? (
                                <span>
                                    Seu acesso gratuito inclui <strong>1 importação completa por IA</strong>. Para importar novos editais com IA, assine um plano.
                                </span>
                            ) : (
                                <span>
                                    Você atingiu o limite mensal de <strong>{aiLimits.limit} importações com IA</strong> do seu plano. O catálogo oficial e a criação manual continuam disponíveis sem limite.
                                </span>
                            )}
                        </p>
                        <div className="mx-auto grid w-full max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-3">
                            <button
                                onClick={() => {
                                    if (aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free') {
                                        onCloseModal();
                                        navigate('/planos');
                                    } else {
                                        toast.info("Entre em contato com o suporte para expandir seus créditos.");
                                    }
                                }}
                                className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 p-4 text-left transition-all hover:border-primary/45 hover:bg-primary/15"
                            >
                                <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                    <Sparkles size={18} />
                                </div>
                                <div className="z-10">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-foreground">
                                        {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? 'Assinar' : 'Suporte'}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">
                                        {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? 'Ver planos e liberar IA' : 'Pedir mais créditos'}
                                    </p>
                                </div>
                            </button>
                            <button
                                onClick={onSwitchToReady}
                                className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all hover:border-sky-500/40 hover:bg-sky-500/10 dark:bg-white/[0.03]"
                            >
                                <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                                    <Database size={18} />
                                </div>
                                <div className="z-10">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-foreground">Catálogo</p>
                                    <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">Usar edital pronto</p>
                                </div>
                            </button>
                            <button
                                onClick={onSwitchToManual}
                                className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 dark:bg-white/[0.03]"
                            >
                                <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <Plus size={18} />
                                </div>
                                <div className="z-10">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-foreground">Manual</p>
                                    <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">Criar do zero</p>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {iaErrorMessage && (
                            <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-red-700 dark:text-red-300">
                                        {getAiErrorHeading()}
                                    </p>
                                    {iaErrorMessage !== getAiErrorHeading() && (
                                        <p className="text-[11px] text-red-600 dark:text-red-200/90 mt-1 leading-relaxed">
                                            {iaErrorMessage}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClearErrorMessage}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-red-700 dark:text-red-300 hover:bg-red-500/20 transition-colors"
                                    aria-label="Fechar mensagem de erro"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        <AiSourceStep
                            mode={aiSourceMode}
                            onModeChange={onSourceModeChange}
                            files={pdfFiles}
                            inputText={inputText}
                            onTextChange={onInputTextChange}
                            onSelectFiles={onSelectFiles}
                            onRemoveFile={onRemoveFile}
                            onAnalyze={onAnalyze}
                            disabled={aiSourceMode === 'pdf' ? pdfFiles.length === 0 : !inputText.trim()}
                        />
                        <AiOptionalContext
                            open={showOptionalContext}
                            onOpenChange={onToggleOptionalContext}
                            banca={iaBanca}
                            organ={iaOrigin}
                            cargo={iaPosition}
                            onBancaChange={onBancaChange}
                            onOrganChange={onOriginChange}
                            onCargoChange={onCargoChange}
                        />
                    </>
                )}
            </div>
        </motion.div>
    );
};
