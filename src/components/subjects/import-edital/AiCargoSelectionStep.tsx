import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { AiContentSourceRecovery } from './AiContentSourceRecovery';

export interface AiEditalAnalysisCargo {
    id: string;
    name: string;
    rawLabel?: string;
    evidence?: string;
    label_exibicao?: string | null;
    nome_cargo?: string | null;
    area_codigo?: string | null;
    area_enfase?: string | null;
}

export interface AiEditalAnalysis {
    edital: {
        name: string;
        organ: string | null;
        year: string | null;
        examDate?: string | null;
        exam_date?: string | null;
        banca: string | null;
    };
    cargos: AiEditalAnalysisCargo[];
    missingContentSource?: {
        message: string;
        originalFileCount: number;
    } | null;
}

interface AiCargoSelectionStepProps {
    analysisResult: AiEditalAnalysis;
    selectedCargoId: string;
    selectedCargoName: string;
    onSelectCargo: (cargoId: string, cargoName: string) => void;
    iaPosition: string;
    iaOrigin: string;
    iaBanca: string;
    missingContentSource: { message: string; originalFileCount: number } | null;
    pdfFiles: File[];
    onAddFile: () => void;
    onRemoveFile: (index: number) => void;
    iaErrorMessage: string;
    getAiErrorHeading: () => string;
    pendingExtraction: { id: string; editalName: string; updatedAt: string; source: 'db' | 'fresh' } | null;
    onDiscardPending: () => void;
    isGenericCargoName?: (name?: string | null) => boolean;
    formatLongDetectedText?: (text?: string | null) => string;
    hasOnlyGenericCargoAnalysis?: () => boolean;
}

export const AiCargoSelectionStep: React.FC<AiCargoSelectionStepProps> = ({
    analysisResult,
    selectedCargoId,
    selectedCargoName,
    onSelectCargo,
    iaPosition,
    iaOrigin,
    iaBanca,
    missingContentSource,
    pdfFiles,
    onAddFile,
    onRemoveFile,
    iaErrorMessage,
    getAiErrorHeading,
    pendingExtraction,
    onDiscardPending,
    isGenericCargoName = (value) => !value || ['cargo unico', 'cargo único', 'cargo', 'sem cargo'].includes(String(value).trim().toLowerCase()),
    formatLongDetectedText = (value) => String(value || '').trim(),
    hasOnlyGenericCargoAnalysis = () => false,
}) => {
    const nonGenericCargos = analysisResult.cargos.filter((cargo) => !isGenericCargoName(cargo.name));
    const isSingleCargo = nonGenericCargos.length === 1;
    const resolvedCargoName = selectedCargoName || iaPosition || (isSingleCargo ? nonGenericCargos[0]?.name : '');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-4">
            {/* Contexto Unificado do Edital e Cargo */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        Dados detectados
                    </p>
                    {resolvedCargoName && (
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary truncate max-w-[320px]">
                            {resolvedCargoName}
                        </span>
                    )}
                </div>
                <h3 className="mt-2 max-w-3xl text-xs font-semibold leading-snug text-foreground sm:text-[13px]">
                    {formatLongDetectedText(analysisResult.edital.name) || 'Edital analisado'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-content-muted">
                    {iaOrigin || analysisResult.edital.organ || 'Órgão não identificado'}
                    {analysisResult.edital.year ? ` · ${analysisResult.edital.year}` : ''}
                    {(iaBanca || analysisResult.edital.banca) ? ` · ${iaBanca || analysisResult.edital.banca}` : ''}
                </p>
                {pendingExtraction?.source === 'db' && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                        <div className="flex items-center gap-2 truncate">
                            <FileText size={13} className="shrink-0 text-amber-500" />
                            <span className="truncate">Rascunho recuperado de sessão anterior</span>
                        </div>
                        <button
                            type="button"
                            onClick={onDiscardPending}
                            className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                            <Trash2 size={11} /> Descartar
                        </button>
                    </div>
                )}
                {hasOnlyGenericCargoAnalysis() && (
                    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-semibold leading-relaxed text-amber-200/90">
                            Não encontrei cargos reais com segurança. Volte, ajuste os dados informados e analise novamente antes de continuar.
                        </p>
                    </div>
                )}
            </div>

            {/* Card Principal de Documento Separado / Anexo */}
            {missingContentSource ? (
                <AiContentSourceRecovery
                    message={missingContentSource.message}
                    files={pdfFiles}
                    originalFileCount={missingContentSource.originalFileCount}
                    selectedCargoName={resolvedCargoName}
                    onAdd={onAddFile}
                    onRemove={onRemoveFile}
                />
            ) : null}

            {iaErrorMessage && !missingContentSource && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300">
                        {getAiErrorHeading()}
                    </p>
                    <p className="text-[11px] text-red-600 dark:text-red-200/90 mt-1 leading-relaxed">
                        {iaErrorMessage}
                    </p>
                </div>
            )}

            {/* Seleção de Cargo */}
            {(nonGenericCargos.length > 1 || nonGenericCargos.length === 0) && (
                <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-zinc-900/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
                                    Cargos encontrados no edital
                                </p>
                                {!hasOnlyGenericCargoAnalysis() && (
                                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary">
                                        {`${nonGenericCargos.length} cargos`}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] leading-relaxed text-content-muted">
                                Selecione o cargo para extrair o conteúdo programático.
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 space-y-2">
                        {nonGenericCargos.length > 0 ? (
                            nonGenericCargos.map((cargo) => (
                                <button
                                    key={cargo.id}
                                    type="button"
                                    onClick={() => onSelectCargo(cargo.id, cargo.name)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                        selectedCargoId === cargo.id
                                            ? 'border-primary bg-primary/10 text-content-main shadow-sm shadow-primary/10'
                                            : 'border-border dark:border-white/10 bg-secondary/40 hover:border-primary/40 text-content-main'
                                    }`}
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-bold leading-snug break-words">{cargo.label_exibicao || cargo.name}</span>
                                        {selectedCargoId === cargo.id && (
                                            <CheckCircle2 size={15} className="shrink-0 text-primary" />
                                        )}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="w-full px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-content-main">
                                <p className="text-xs font-bold leading-snug">Não consegui identificar cargos reais no edital.</p>
                                <p className="text-[11px] text-content-muted mt-1">
                                    Revise banca e órgão/concurso e clique em Analisar novamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
