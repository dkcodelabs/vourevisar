import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wand2, PlusCircle, AlertTriangle, ChevronRight, X, ArrowLeft, CheckCircle } from 'lucide-react';
import { analytics } from '@/lib/analytics';

// ─── Tipos ──────────────────────────────────────────────────────────
type FeedbackCategory = 'melhoria' | 'nova_funcionalidade' | 'problema';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (type: string, title: string, description: string) => Promise<string | null>;
    isSubmitting?: boolean;
}

/**
 * FeedbackModal — Usa <style> injetado com !important para vencer
 * o `body { font-family: 'Plus Jakarta Sans' !important }` do
 * design-system.css, que impede qualquer inline style de funcionar.
 *
 * Referência: docs/design/desktop:_nova_solicitação_modal_1/code.html
 */
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting = false }) => {
    const [step, setStep] = React.useState<1 | 2>(1);
    const [selectedCategory, setSelectedCategory] = React.useState<FeedbackCategory | null>(null);
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [showToast, setShowToast] = React.useState(false);
    const [protocolCode, setProtocolCode] = React.useState<string | null>(null);
    const [touched, setTouched] = React.useState<{ title: boolean; description: boolean }>({ title: false, description: false });
    const modalRef = useRef<HTMLDivElement>(null);

    // ESC fecha o modal
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Foco no modal ao abrir + Analytics
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
            analytics.sendEvent('feedback_form_opened');
        }
    }, [isOpen]);

    // ── Constantes de validação ─────────────────────────────
    const TITLE_MIN = 8;
    const TITLE_MAX = 80;
    const DESC_MIN = 20;
    const DESC_MAX = 1000;

    // ── Sanitização ────────────────────────────────────────
    const sanitize = (v: string) => v.replace(/\s+/g, ' ').trim();

    // ── Validação ──────────────────────────────────────────
    const titleSanitized = sanitize(title);
    const descSanitized = sanitize(description);

    const getErrors = () => {
        const errs: { title?: string; description?: string } = {};
        if (titleSanitized.length === 0) errs.title = 'Título é obrigatório';
        else if (titleSanitized.length < TITLE_MIN) errs.title = `Mínimo ${TITLE_MIN} caracteres`;
        if (descSanitized.length === 0) errs.description = 'Descrição é obrigatória';
        else if (descSanitized.length < DESC_MIN) errs.description = `Mínimo ${DESC_MIN} caracteres`;
        return errs;
    };

    const errors = getErrors();
    const isFormValid = !errors.title && !errors.description && !!selectedCategory;

    React.useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setStep(1);
                setSelectedCategory(null);
                setTitle('');
                setDescription('');
                setShowToast(false);
                setProtocolCode(null);
                setTouched({ title: false, description: false });
            }, 200);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCategorySelect = (category: FeedbackCategory) => {
        setSelectedCategory(category);
        setStep(2);
    };

    const isStep1 = step === 1;
    const isStep2 = step === 2;

    const getCategoryDetails = () => {
        switch (selectedCategory) {
            case 'melhoria':
                return { label: 'Melhoria', icon: <Wand2 className="fbm-icon" />, iconBg: 'fbm-icon-blue' };
            case 'nova_funcionalidade':
                return { label: 'Nova funcionalidade', icon: <PlusCircle className="fbm-icon" />, iconBg: 'fbm-icon-purple' };
            case 'problema':
                return { label: 'Problema', icon: <AlertTriangle className="fbm-icon" />, iconBg: 'fbm-icon-red' };
            default:
                return null;
        }
    };

    const catDetails = getCategoryDetails();

    return createPortal(
        <>
            {/* ── Scoped styles that use !important to override design-system.css ── */}
            <style>{`
                .fbm-root,
                .fbm-root *,
                .fbm-root h1,
                .fbm-root h2,
                .fbm-root h3,
                .fbm-root h4,
                .fbm-root h5,
                .fbm-root h6,
                .fbm-root p,
                .fbm-root span,
                .fbm-root label,
                .fbm-root button,
                .fbm-root input,
                .fbm-root textarea {
                    font-family: 'Lexend', sans-serif !important;
                }
                .fbm-title {
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    line-height: 1.3 !important;
                    color: #1e293b;
                    margin: 0 !important;
                }
                .fbm-subtitle {
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    line-height: 1.4 !important;
                    color: #1e293b;
                    margin: 0 0 4px 0 !important;
                }
                .fbm-desc-sm {
                    font-size: 11px !important;
                    color: #64748b;
                    margin: 0 !important;
                }
                .fbm-cat-name {
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #1e293b;
                    margin: 0 !important;
                }
                .fbm-cat-desc {
                    font-size: 11px !important;
                    color: #64748b;
                    margin: 0 !important;
                }
                .fbm-badge {
                    width: 26px;
                    height: 26px;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                }
                .fbm-btn-cancel {
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    color: #475569;
                    padding: 8px 16px;
                    border-radius: 8px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                .fbm-btn-cancel:hover {
                    background: #e2e8f0;
                }
                .fbm-btn-submit {
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    padding: 8px 20px;
                    border-radius: 8px;
                    background-color: #1985f0;
                    color: #fff;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 10px 15px -3px rgba(25, 133, 240, 0.2);
                }
                .fbm-btn-submit:hover {
                    background-color: #1676d6;
                }
                .fbm-card-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 10px;
                    border: 1.5px solid #f1f5f9;
                    text-align: left;
                    width: 100%;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .fbm-card-btn:hover {
                    border-color: rgba(25, 133, 240, 0.5);
                    background: rgba(25, 133, 240, 0.05);
                }
                .fbm-card-btn:hover .fbm-chevron {
                    color: #1985f0;
                }
                .fbm-icon {
                    width: 20px;
                    height: 20px;
                }
                .fbm-chevron {
                    width: 18px;
                    height: 18px;
                    color: #cbd5e1;
                    transition: color 0.15s ease;
                }
                .fbm-icon-box {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .fbm-icon-blue { background: #dbeafe; color: #2563eb; }
                .fbm-icon-purple { background: #f3e8ff; color: #9333ea; }
                .fbm-icon-red { background: #fee2e2; color: #dc2626; }
                .fbm-selected-type {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: #f8fafc;
                    border: 1.5px solid #f1f5f9;
                }
                .fbm-selected-type-label {
                    font-size: 9px !important;
                    font-weight: 600 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    margin: 0 !important;
                }
                .fbm-selected-type-name {
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    color: #1e293b;
                    margin: 0 !important;
                }
                .fbm-label {
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    color: #334155;
                }
                .fbm-input {
                    width: 100%;
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 12px !important;
                    outline: none;
                    transition: all 0.15s ease;
                }
                .fbm-input:focus {
                    border-color: #1985f0;
                    box-shadow: 0 0 0 3px rgba(25, 133, 240, 0.1);
                }
                .fbm-input-error {
                    border-color: #ef4444 !important;
                }
                .fbm-input-error:focus {
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                }
                .fbm-field-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-top: 3px;
                }
                .fbm-error-msg {
                    font-size: 10px !important;
                    font-weight: 500 !important;
                    color: #ef4444;
                    margin: 0 !important;
                }
                .fbm-counter {
                    font-size: 10px !important;
                    font-weight: 500 !important;
                    color: #94a3b8;
                    margin: 0 !important;
                    flex-shrink: 0;
                }
                .fbm-counter-warn {
                    color: #f59e0b !important;
                }
                .fbm-counter-error {
                    color: #ef4444 !important;
                }
                .fbm-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .fbm-dot-active { background-color: #1985f0; }
                .fbm-dot-inactive { background-color: #e2e8f0; }
                .fbm-toast-title {
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    line-height: 1.25;
                    color: #1e293b;
                    margin: 0 !important;
                }
                .fbm-toast-desc {
                    font-size: 11px !important;
                    color: #64748b;
                    margin-top: 2px !important;
                }
                .fbm-close-btn {
                    background: none !important;
                    border: none !important;
                    cursor: pointer;
                    padding: 0 !important;
                    color: #94a3b8;
                    transition: color 0.15s ease;
                }
                .fbm-close-btn:hover {
                    color: #475569;
                }

                /* Dark mode */
                .dark .fbm-title,
                .dark .fbm-subtitle,
                .dark .fbm-cat-name { color: #f1f5f9; }
                .dark .fbm-desc-sm,
                .dark .fbm-cat-desc { color: #94a3b8; }
                .dark .fbm-card-btn { border-color: #1e293b; }
                .dark .fbm-btn-cancel { color: #94a3b8; }
                .dark .fbm-btn-cancel:hover { background: #1e293b; }
                .dark .fbm-label { color: #cbd5e1; }
                .dark .fbm-input {
                    background-color: #1e293b;
                    border-color: #334155;
                    color: #f1f5f9;
                }
                .dark .fbm-dot-inactive { background-color: #334155; }
                .dark .fbm-icon-blue { background: rgba(30, 64, 175, 0.3); color: #60a5fa; }
                .dark .fbm-icon-purple { background: rgba(88, 28, 135, 0.3); color: #c084fc; }
                .dark .fbm-icon-red { background: rgba(127, 29, 29, 0.3); color: #f87171; }
                .dark .fbm-toast-title { color: #f1f5f9; }
                .dark .fbm-toast-desc { color: #94a3b8; }
                .dark .fbm-selected-type { background: #1e293b; border-color: #334155; }
                .dark .fbm-selected-type-label { color: #64748b; }
                .dark .fbm-selected-type-name { color: #f1f5f9; }

                /* Mobile fullscreen */
                @media (max-width: 640px) {
                    .fbm-root {
                        padding: 0 !important;
                    }
                    .fbm-modal-container {
                        max-width: 100% !important;
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 100% !important;
                        border-radius: 0 !important;
                        border: none !important;
                    }
                    .fbm-footer {
                        position: sticky;
                        bottom: 0;
                    }
                    .fbm-card-btn {
                        min-height: 56px;
                    }
                    .fbm-btn-cancel,
                    .fbm-btn-submit {
                        min-height: 44px !important;
                        padding: 10px 20px !important;
                    }
                }
            `}</style>

            {/* Backdrop */}
            <div
                className="fbm-root fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
                aria-hidden="true"
            >
                {/* Modal Container */}
                <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Novo Feedback"
                    tabIndex={-1}
                    className="fbm-modal-container bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden outline-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ─────────────────────────────────────── */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isStep2 && (
                                <button onClick={() => setStep(1)} className="fbm-close-btn" aria-label="Voltar para etapa anterior">
                                    <ArrowLeft className="fbm-icon" aria-hidden="true" />
                                </button>
                            )}
                            <div
                                className="fbm-badge flex items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: isStep1 ? 'rgba(25, 133, 240, 0.1)' : '#1985f0',
                                    color: isStep1 ? '#1985f0' : '#fff',
                                }}
                                aria-hidden="true"
                            >
                                {step}/2
                            </div>
                            <h2 className="fbm-title dark:text-slate-100">Nova Solicitação</h2>
                        </div>
                        <button onClick={onClose} className="fbm-close-btn" aria-label="Fechar modal">
                            <X className="fbm-icon" aria-hidden="true" />
                        </button>
                    </div>

                    {/* ── Content Step 1 ─────────────────────────────── */}
                    {isStep1 && (
                        <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                                <h3 className="fbm-subtitle dark:text-slate-100">O que você deseja relatar?</h3>
                                <p className="fbm-desc-sm dark:text-slate-400">Selecione uma categoria para seu pedido</p>
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                                {/* Melhoria */}
                                <button onClick={() => handleCategorySelect('melhoria')} className="fbm-card-btn">
                                    <div className="fbm-icon-box fbm-icon-blue">
                                        <Wand2 className="fbm-icon" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="fbm-cat-name dark:text-slate-100">Melhoria</p>
                                        <p className="fbm-cat-desc dark:text-slate-400">Sugira um ajuste em algo que já existe</p>
                                    </div>
                                    <ChevronRight className="fbm-chevron" />
                                </button>

                                {/* Nova funcionalidade */}
                                <button onClick={() => handleCategorySelect('nova_funcionalidade')} className="fbm-card-btn">
                                    <div className="fbm-icon-box fbm-icon-purple">
                                        <PlusCircle className="fbm-icon" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="fbm-cat-name dark:text-slate-100">Nova funcionalidade</p>
                                        <p className="fbm-cat-desc dark:text-slate-400">Proponha uma nova ferramenta para a plataforma</p>
                                    </div>
                                    <ChevronRight className="fbm-chevron" />
                                </button>

                                {/* Problema */}
                                <button onClick={() => handleCategorySelect('problema')} className="fbm-card-btn">
                                    <div className="fbm-icon-box fbm-icon-red">
                                        <AlertTriangle className="fbm-icon" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="fbm-cat-name dark:text-slate-100">Problema</p>
                                        <p className="fbm-cat-desc dark:text-slate-400">Relate um erro ou dificuldade técnica</p>
                                    </div>
                                    <ChevronRight className="fbm-chevron" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Content Step 2 ─────────────────────────────── */}
                    {isStep2 && catDetails && (
                        <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Tipo selecionado */}
                            <div className="fbm-selected-type dark:bg-slate-800 dark:border-slate-700">
                                <div className={`fbm-icon-box ${catDetails.iconBg}`} style={{ width: 32, height: 32 }}>
                                    {catDetails.icon}
                                </div>
                                <div>
                                    <p className="fbm-selected-type-label dark:text-slate-500">Tipo selecionado</p>
                                    <p className="fbm-selected-type-name dark:text-slate-100">{catDetails.label}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label htmlFor="fbm-titulo" className="fbm-label dark:text-slate-300">Título <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    id="fbm-titulo"
                                    type="text"
                                    placeholder="Ex.: Não consigo concluir revisão"
                                    className={`fbm-input dark:bg-slate-800 dark:border-slate-700 dark:text-white ${touched.title && errors.title ? 'fbm-input-error' : ''}`}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => setTouched((p) => ({ ...p, title: true }))}
                                    maxLength={TITLE_MAX}
                                />
                                <div className="fbm-field-footer">
                                    <p className="fbm-error-msg">{touched.title && errors.title ? errors.title : ''}</p>
                                    <p className={`fbm-counter ${titleSanitized.length >= TITLE_MAX ? 'fbm-counter-error' : titleSanitized.length >= TITLE_MAX * 0.9 ? 'fbm-counter-warn' : ''}`}>
                                        {titleSanitized.length}/{TITLE_MAX}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label htmlFor="fbm-descricao" className="fbm-label dark:text-slate-300">Descrição <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    id="fbm-descricao"
                                    placeholder="Descreva o que aconteceu com detalhes..."
                                    rows={4}
                                    className={`fbm-input dark:bg-slate-800 dark:border-slate-700 dark:text-white ${touched.description && errors.description ? 'fbm-input-error' : ''}`}
                                    style={{ resize: 'none' }}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => setTouched((p) => ({ ...p, description: true }))}
                                    maxLength={DESC_MAX}
                                />
                                <div className="fbm-field-footer">
                                    <p className="fbm-error-msg">{touched.description && errors.description ? errors.description : ''}</p>
                                    <p className={`fbm-counter ${descSanitized.length >= DESC_MAX ? 'fbm-counter-error' : descSanitized.length >= DESC_MAX * 0.9 ? 'fbm-counter-warn' : ''}`}>
                                        {descSanitized.length}/{DESC_MAX}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Footer ──────────────────────────────────────── */}
                    <div className="fbm-footer px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                            onClick={isStep1 ? onClose : () => setStep(1)}
                            className="fbm-btn-cancel dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            {isStep1 ? 'Cancelar' : 'Voltar'}
                        </button>

                        {isStep1 ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div className="fbm-dot fbm-dot-active" />
                                <div className="fbm-dot fbm-dot-inactive dark:bg-slate-700" />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <div className="fbm-dot fbm-dot-active" />
                                    <div className="fbm-dot fbm-dot-active" />
                                </div>
                                <button
                                    onClick={async () => {
                                        // Marcar todos como touched para mostrar erros
                                        setTouched({ title: true, description: true });
                                        if (!isFormValid) return;
                                        if (onSubmit) {
                                            try {
                                                const code = await onSubmit(selectedCategory!, titleSanitized, descSanitized);
                                                if (code) {
                                                    setProtocolCode(code);
                                                    setShowToast(true);
                                                    setTouched({ title: false, description: false });
                                                    analytics.sendEvent('feedback_submitted', { type: selectedCategory });
                                                }
                                            } catch (error) {
                                                analytics.sendEvent('feedback_submit_failed', { type: selectedCategory });
                                                // Toast amigável tratado pelo hook pai
                                            }
                                        } else {
                                            setShowToast(true);
                                        }
                                    }}
                                    className="fbm-btn-submit"
                                    style={{ marginLeft: '16px', opacity: (!isFormValid || isSubmitting) ? 0.5 : 1, cursor: (!isFormValid || isSubmitting) ? 'not-allowed' : 'pointer' }}
                                    disabled={!isFormValid || isSubmitting}
                                >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Success Toast ──────────────────────────────────── */}
            {showToast && (
                <div className="fbm-root fixed bottom-8 right-8 z-[10000]">
                    <div
                        className="bg-white dark:bg-slate-800 shadow-xl"
                        style={{
                            borderLeft: '4px solid #22c55e',
                            borderRadius: '8px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            minWidth: '320px',
                        }}
                    >
                        <div
                            style={{
                                flexShrink: 0,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#dcfce7',
                            }}
                        >
                            <CheckCircle className="fbm-icon" style={{ color: '#16a34a' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p className="fbm-toast-title dark:text-slate-100">Solicitação enviada com sucesso</p>
                            <p className="fbm-toast-desc dark:text-slate-400">
                                Protocolo: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{protocolCode || 'FBK-XXXXX'}</span>
                            </p>
                        </div>
                        <button onClick={() => { setShowToast(false); onClose(); }} className="fbm-close-btn">
                            <X style={{ width: 20, height: 20 }} />
                        </button>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};
