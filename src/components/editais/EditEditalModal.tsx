import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Briefcase, CalendarDays, GraduationCap, Info, Loader2, Save, X } from 'lucide-react';
import { UserEdital } from '@/pages/Editais';
import { toastGate } from '@/lib/errors/toastGate';

interface EditEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    edital: UserEdital | null;
    onSave: (id: string, updates: { organ: string; position: string; year: string; exam_date?: string; exam_board?: string }) => Promise<void>;
}

type FieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    placeholder?: string;
    type?: React.HTMLInputTypeAttribute;
    helper?: string;
    required?: boolean;
};

const Field = ({ id, label, value, onChange, icon, placeholder, type = 'text', helper, required }: FieldProps) => (
    <div className="space-y-2">
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.16em] text-content-muted">
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <div className="group relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted transition-colors group-focus-within:text-primary">
                {icon}
            </div>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-3 text-sm font-semibold text-foreground shadow-sm shadow-black/[0.03] outline-none transition-colors placeholder:text-content-muted/60 hover:border-primary/30 focus:border-primary/55 focus:ring-2 focus:ring-primary/15 dark:bg-surface/70 [color-scheme:light] dark:[color-scheme:dark]"
            />
        </div>
        {helper && (
            <p className="text-[11px] font-medium leading-relaxed text-content-muted">
                {helper}
            </p>
        )}
    </div>
);

export const EditEditalModal = ({ isOpen, onClose, edital, onSave }: EditEditalModalProps) => {
    const formId = useId();
    const [organ, setOrgan] = useState('');
    const [position, setPosition] = useState('');
    const [year, setYear] = useState('');
    const [examDate, setExamDate] = useState('');
    const [examBoard, setExamBoard] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (edital && isOpen) {
            setOrgan(edital.organ || edital.name.split(' - ')[0] || '');
            setPosition(edital.position || (edital.name.split(' - ').length > 1 ? edital.name.split(' - ').slice(1).join(' - ') : ''));
            setYear(edital.year || '');
            setExamDate(edital.examDate || '');
            setExamBoard(edital.examBoard || '');
        }
    }, [edital, isOpen]);

    const handleSave = async () => {
        if (!edital) return;
        if (!organ.trim()) {
            toastGate.notifyError('O órgão ou concurso é obrigatório.', 'VAL-001');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(edital.id, {
                organ: organ.trim(),
                position: position.trim(),
                year: year.trim(),
                exam_date: examDate.trim() || undefined,
                exam_board: examBoard.trim() || undefined,
            });
            onClose();
        } catch (err) {
            console.error('Erro ao salvar edital:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 14 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`${formId}-title`}
                        className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-modal text-modal-foreground shadow-2xl shadow-black/25 dark:border-white/[0.08]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-modal px-5 py-4 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                                    <Building2 size={19} />
                                </div>
                                <div className="min-w-0">
                                    <h2 id={`${formId}-title`} className="text-lg font-black tracking-tight text-foreground sm:text-xl">
                                        Editar edital
                                    </h2>
                                    <p className="mt-0.5 text-sm font-medium leading-relaxed text-content-muted">
                                        Atualize os dados que identificam este planejamento.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fechar modal de edição do edital"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                            <div className="grid gap-5">
                                <Field
                                    id={`${formId}-organ`}
                                    label="Órgão / concurso"
                                    value={organ}
                                    onChange={setOrgan}
                                    icon={<Building2 size={17} />}
                                    placeholder="Ex: PMES, PCES, INSS..."
                                    required
                                />
                                <Field
                                    id={`${formId}-position`}
                                    label="Cargo / especialidade"
                                    value={position}
                                    onChange={setPosition}
                                    icon={<Briefcase size={17} />}
                                    placeholder="Ex: Soldado, Analista, Agente..."
                                />
                                <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
                                    <Field
                                        id={`${formId}-year`}
                                        label="Ano do edital"
                                        value={year}
                                        onChange={setYear}
                                        icon={<CalendarDays size={17} />}
                                        placeholder="Ex: 2026"
                                    />
                                    <Field
                                        id={`${formId}-exam-date`}
                                        label="Data da prova"
                                        type="date"
                                        value={examDate}
                                        onChange={setExamDate}
                                        icon={<CalendarDays size={17} />}
                                        helper="Opcional. Sem data, o sistema não comprime revisões nem calcula métricas dependentes da prova."
                                    />
                                </div>
                                <Field
                                    id={`${formId}-exam-board`}
                                    label="Nome da banca"
                                    value={examBoard}
                                    onChange={setExamBoard}
                                    icon={<GraduationCap size={17} />}
                                    placeholder="Ex: Cebraspe, FGV, FCC..."
                                />

                                {!examDate && (
                                    <div className="flex items-start gap-2.5 rounded-2xl bg-warning/10 p-3 text-warning ring-1 ring-warning/20">
                                        <Info size={16} className="mt-0.5 shrink-0" />
                                        <p className="text-[12px] font-semibold leading-relaxed text-foreground">
                                            Este edital pode ficar sem data. Só não será usado como base para ritmo até a prova e métricas dependentes desse prazo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-modal/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="h-11 rounded-xl px-5 text-sm font-bold text-content-muted transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                                {isSaving ? 'Salvando' : 'Salvar alterações'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
