import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize, Minimize, Pause, Play, Music, Square, PictureInPicture2 } from 'lucide-react';

interface FocusModalProps {
    isOpen: boolean;
    onClose: () => void;
    time: string;
    topicName: string;
    subjectName: string;
    isPaused: boolean;
    onTogglePause: () => void;
    onStopAndEvaluate: () => void;
    onTogglePiP?: () => void; // Optional: only when browser supports PiP
}

export const FocusModal: React.FC<FocusModalProps> = ({
    isOpen,
    onClose,
    time,
    topicName,
    subjectName,
    isPaused,
    onTogglePause,
    onStopAndEvaluate,
    onTogglePiP,
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Sync fullscreen state with browser
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleOpenLofiMusic = () => {
        window.open(
            'https://www.youtube.com/results?search_query=musica+para+estudar+lofi+concentracao',
            '_blank',
            'noopener,noreferrer'
        );
    };

    // Sai do fullscreen antes de fechar ou ativar PiP (browser não permite os dois simultaneamente)
    const exitFullscreenIfNeeded = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => { });
        }
    };

    const handleClose = async () => {
        await exitFullscreenIfNeeded();
        onClose();
    };

    const handlePiP = () => {
        // IMPORTANTE: onTogglePiP deve ser chamado de forma SÍNCRONA neste handler.
        // O Safari rejeita webkitSetPresentationMode se chamado após qualquer await/setTimeout.
        // Por isso removemos o exitFullscreenIfNeeded() e o setTimeout aqui.
        // O FocusTimer.handleTogglePiP já fecha o modal antes de chamar esta função.
        onTogglePiP?.();
    };


    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#030712] text-slate-100 animate-in fade-in duration-300">

            {/* Grain Overlay */}
            <div
                className="absolute inset-0 z-[1] opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage:
                        'url(https://lh3.googleusercontent.com/aida-public/AB6AXuAfBsSekLKMbksYhEK0G1JxaAO3ANYbIEnBke5YMInA5DCCBonbF-Go4GGvG-CibZuUGraYkMNG3Rw6dfT6O7MoqqPINfDWtKJN2fQGyJ6usDK2LtH-qmpq2jtii6nSnFycvu5RoX8UdmaBvjOH5Rg8RmleDhmREK-AtzIeMOB1k5uOoAz-ZzXKQ-rePk5exdwB_RnonJeuy3YupswETt0GG3XusD9qQYbDllb0vJQ_wUtJL_GBlIV2VUE2yvw9GvzLrYLgwvzFbz6h)',
                }}
            />

            {/* Ambient Lights */}
            <div className="absolute inset-0 bg-[#020617] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vh] bg-cyan-400/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* Main Container – Glass Effect */}
            <div
                className="relative flex h-full w-full flex-col z-10 border border-white/5"
                style={{
                    background:
                        'radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.4) 0%, rgba(3, 7, 18, 0.95) 100%)',
                    backdropFilter: 'blur(60px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(60px) saturate(150%)',
                }}
            >

                {/* ── Header ── */}
                <header className="flex items-center justify-between w-full px-6 md:px-10 py-6 md:py-8 z-20">
                    {/* Brand */}
                    <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
                        </div>
                        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                            Focus · Vou Revisar
                        </h2>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* PiP button — only shown when supported */}
                        {onTogglePiP && (
                            <button
                                onClick={handlePiP}
                                className="flex w-11 h-11 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                                title="Janela Flutuante (PiP)"
                            >
                                <PictureInPicture2 size={20} />
                            </button>
                        )}

                        {/* Fullscreen toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="flex w-11 h-11 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                            title="Tela Cheia"
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>

                        {/* Close (keeps timer running) */}
                        <button
                            onClick={handleClose}
                            className="flex w-11 h-11 items-center justify-center rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/10 text-white/70 hover:text-white transition-all ml-1 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                            title="Minimizar (Timer continua rodando)"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-20">
                    <div className="flex flex-col items-center text-center">
                        {/* Timer */}
                        <h1
                            className="text-white text-[80px] sm:text-[130px] md:text-[180px] font-timer font-extralight leading-none tracking-tight select-none mb-6 tabular-nums"
                            style={{
                                textShadow:
                                    '0 0 50px rgba(59, 130, 246, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
                            }}
                        >
                            {time}
                        </h1>

                        {/* Topic / Subject */}
                        <div className="space-y-2">
                            <p className="text-white/90 text-xl md:text-2xl font-light tracking-wide">
                                {topicName}
                            </p>
                            <p className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em]">
                                {subjectName}
                            </p>
                        </div>

                        {/* Separator line (decoration) */}
                        <div className="w-48 mt-10 h-[1px] bg-white/10 relative overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                style={{ width: '45%' }}
                            />
                        </div>
                    </div>
                </main>

                {/* ── Footer Controls ── */}
                <footer className="w-full pb-12 md:pb-16 pt-8 flex flex-col items-center gap-8 z-20">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        {/* Pause / Resume */}
                        <button
                            onClick={onTogglePause}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                            {isPaused ? (
                                <>
                                    <Play size={20} className="fill-current" />
                                    <span className="text-sm font-medium tracking-wide">Retomar</span>
                                </>
                            ) : (
                                <>
                                    <Pause size={20} className="fill-current" />
                                    <span className="text-sm font-medium tracking-wide">Pausar</span>
                                </>
                            )}
                        </button>

                        {/* Lofi / Music → YouTube */}
                        <button
                            onClick={handleOpenLofiMusic}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 group"
                            title="Abrir no YouTube"
                        >
                            <Music size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-sm font-medium tracking-wide">Lofi Music</span>
                        </button>

                        {/* Stop and Evaluate */}
                        <button
                            onClick={onStopAndEvaluate}
                            className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-white text-slate-950 font-semibold text-base shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
                        >
                            <Square size={20} fill="currentColor" />
                            Parar e Avaliar
                        </button>
                    </div>

                    <p className="text-white/20 text-[10px] font-medium uppercase tracking-[0.3em]">
                        ESC para minimizar&nbsp;•&nbsp;ESPAÇO para pausar
                    </p>
                </footer>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:120px_120px] pointer-events-none" />
            </div>
        </div>,
        document.body
    );
};
