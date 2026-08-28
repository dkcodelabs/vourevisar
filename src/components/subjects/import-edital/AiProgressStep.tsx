import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Loader2, AlertTriangle, X } from 'lucide-react';

interface AiProgressStepProps {
    stage: 'analyzing' | 'extracting';
    processingMsg: string;
    extractionCargoName?: string | null;
    extractionCargoLabel?: string;
    iaProgress: number;
    onCancel: () => void;
    isGenericCargoName?: (name?: string | null) => boolean;
    formatLongDetectedText?: (text?: string | null) => string;
}

export const AiProgressStep: React.FC<AiProgressStepProps> = ({
    stage,
    processingMsg,
    extractionCargoName,
    extractionCargoLabel = 'Cargo selecionado',
    iaProgress,
    onCancel,
    isGenericCargoName = (value) => !value || ['cargo unico', 'cargo único', 'cargo', 'sem cargo'].includes(String(value).trim().toLowerCase()),
    formatLongDetectedText = (value) => String(value || '').trim(),
}) => {
    const steps = stage === 'analyzing'
        ? [
            { label: 'Lendo edital', from: 0, to: 34 },
            { label: 'Identificando cargos e áreas', from: 34, to: 80 },
            { label: 'Extraindo cargos disponíveis', from: 80, to: 100 },
        ]
        : [
            { label: 'Lendo conteúdo do cargo', from: 0, to: 36 },
            { label: 'Organizando matérias e tópicos', from: 36, to: 86 },
            { label: 'Verificando pesos da prova', from: 86, to: 94 },
            { label: 'Organizando resultado', from: 94, to: 100 },
        ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl mx-auto py-8">
            <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-zinc-900/50 p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Sparkles size={18} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-content-main">
                            {stage === 'analyzing' ? 'Analisando edital...' : 'Extraindo disciplinas...'}
                        </h3>
                        <p className="text-[11px] text-content-muted">
                            {stage === 'analyzing' ? processingMsg : 'Isso pode levar alguns instantes.'}
                        </p>
                    </div>
                </div>

                {stage === 'extracting' && extractionCargoName && !isGenericCargoName(extractionCargoName) && (
                    <div className="mb-5 rounded-xl border border-white/10 bg-secondary/45 px-4 py-3.5 dark:bg-zinc-950/20">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-content-muted">
                            {extractionCargoLabel}
                        </p>
                        <p className="text-xs font-semibold leading-snug text-content-main">
                            {formatLongDetectedText(extractionCargoName)}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {steps.map((step) => {
                        const stepProgress = Math.max(0, Math.min(100, ((iaProgress - step.from) / (step.to - step.from)) * 100));
                        const done = stepProgress >= 100;
                        const active = stepProgress > 0 && stepProgress < 100;
                        return (
                            <div key={step.label} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    {done ? (
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                    ) : active ? (
                                        <Loader2 size={14} className="text-primary animate-spin" />
                                    ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border border-content-muted/40" />
                                    )}
                                    <span className={`text-xs font-bold flex-1 ${done || active ? 'text-content-main' : 'text-content-muted/60'}`}>
                                        {step.label}
                                    </span>
                                    {(done || active) && (
                                        <span className={`text-[10px] font-bold ${done ? 'text-emerald-400' : 'text-primary'}`}>
                                            {done ? 'Concluído' : 'Em andamento'}
                                        </span>
                                    )}
                                </div>
                                <div className="ml-5 h-1 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-200 ease-out ${done ? 'bg-emerald-400' : active ? 'bg-primary' : 'bg-white/20'}`}
                                        style={{ width: `${stepProgress}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-amber-800 dark:text-amber-100" role="status">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                        <div>
                            <p className="text-xs font-bold">Não feche esta janela</p>
                            <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-amber-800/80 dark:text-amber-100/75">
                                Mantenha esta tela aberta até a conclusão.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
                    >
                        <X size={13} />
                        Cancelar processo
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
