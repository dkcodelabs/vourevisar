import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { usePiPTimer } from '@/hooks/usePiPTimer';
import { useTimer } from '@/contexts/TimerContext';
import { FocusModal } from './timer/FocusModal';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FocusTimerProps { }

export const FocusTimer: React.FC<FocusTimerProps> = () => {
  const navigate = useNavigate();
  const { activeTimer, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [displayTime, setDisplayTime] = useState<string>('00:00');
  const [justReturned, setJustReturned] = useState(false);

  // Focus Modal state
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [topicDisplay, setTopicDisplay] = useState('Sessão de Estudos');
  const [subjectDisplay, setSubjectDisplay] = useState('Foco Total');

  // Calculate elapsed time
  useEffect(() => {
    const updateTime = () => {
      if (activeTimer) {
        const now = Date.now();
        let totalMs = 0;

        if (activeTimer.status === 'PAUSED') {
          totalMs = activeTimer.accumulatedTime || 0;
        } else {
          const currentSession = activeTimer.startTime ? now - activeTimer.startTime : 0;
          totalMs = (activeTimer.accumulatedTime || 0) + currentSession;
        }

        const totalSeconds = Math.floor(totalMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');

        let formatted = `${pad(minutes)}:${pad(seconds)}`;
        if (hours > 0) formatted = `${pad(hours)}:${formatted}`;
        setDisplayTime(formatted);
      } else {
        setDisplayTime('00:00');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const activeTopicId = activeTimer?.topicId || null;
  const isPaused = activeTimer?.status === 'PAUSED';

  // --- PiP ---
  const { canvasRef, videoRef, togglePiP, isSupported } = usePiPTimer({
    displayTime,
    isActive: !!activeTopicId && !isPaused,
  });

  // Feedback effect para quando sai do PiP nativo (Standard API)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLeavePiP = () => {
      setJustReturned(true);
      setTimeout(() => setJustReturned(false), 1500);
    };
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => video.removeEventListener('leavepictureinpicture', handleLeavePiP);
  }, [videoRef]);

  // --- Fetch topic/subject name for the modal ---
  const fetchTopicName = useCallback(async (topicId: string) => {
    try {
      const { data } = await supabase
        .from('topics')
        .select('name, subjects(name)')
        .eq('id', topicId)
        .single();

      if (data) {
        setTopicDisplay(data.name || 'Tópico Ativo');
        const subject = data.subjects as unknown as { name?: string | null } | null;
        setSubjectDisplay(subject?.name || 'Revisão');
      }
    } catch {
      setTopicDisplay('Tópico Ativo');
      setSubjectDisplay('Revisão');
    }
  }, []);

  // Busca nome do tópico automaticamente quando o timer muda (necessário para o CSS PiP Overlay)
  useEffect(() => {
    if (activeTopicId) {
      fetchTopicName(activeTopicId);
    } else {
      setTopicDisplay('Sessão de Estudos');
      setSubjectDisplay('Foco Total');
    }
  }, [activeTopicId, fetchTopicName]);

  // handlers
  const handleClick = () => {
    if (activeTopicId) {
      navigate(`/revisoes?topicId=${activeTopicId}`, {
        state: { focusTopicId: activeTopicId },
      });
    } else {
      navigate('/revisoes');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeTopicId) {
      e.stopPropagation();
      e.preventDefault();
      fetchTopicName(activeTopicId);
      setIsFocusModalOpen(true);
    }
  };

  const handleTogglePause = useCallback(() => {
    if (!activeTimer) return;
    if (isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [activeTimer, isPaused, pauseTimer, resumeTimer]);

  // Fecha o FocusModal e ativa o PiP de forma SÍNCRONA.
  // CRÍTICO: NÃO usar await ou setTimeout antes de togglePiP().
  const handleTogglePiP = useCallback(() => {
    setIsFocusModalOpen(false);
    togglePiP();
  }, [togglePiP]);

  // "Parar e Avaliar":
  // 1. Sai do fullscreen
  // 2. PAUSA o timer ANTES de navegar.
  //    BUG SEM ISSO: Safari recebe RUNNING via Realtime → quando usuário clica no tópico
  //    em Revisoes.tsx, handleMarkCompleted detecta RUNNING e abre o modal de avaliação
  //    no Safari também (comportamento indesejado — o modal só deve abrir no browser
  //    onde o usuário clicou "Parar e Avaliar").
  // 3. Fecha o modal, navega para Revisoes com state openEvaluationForTopic.
  // → handleMarkCompleted em Revisoes.tsx detecta PAUSED deste tópico e abre o modal.
  const handleStopAndEvaluate = useCallback(async () => {
    if (!activeTopicId) return;

    // 1. Sair do fullscreen se necessário
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => { });
    }

    // 2. PAUSAR agora — sincroniza PAUSED para outros browsers via Supabase Realtime
    pauseTimer();

    // 3. Fechar o modal e navegar
    setIsFocusModalOpen(false);
    navigate('/revisoes', {
      state: { openEvaluationForTopic: activeTopicId },
    });
  }, [activeTopicId, navigate, pauseTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isFocusModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      }
      if (e.code === 'Escape') {
        setIsFocusModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusModalOpen, handleTogglePause]);

  const getTitle = () => {
    const base = activeTopicId
      ? isPaused
        ? 'Revisão Pausada'
        : 'Ir para tópico ativo'
      : 'Iniciar revisão';

    if (activeTopicId) {
      return `${base} | Duplo Clique: Modo Foco | Clique Direito → PiP`;
    }
    return base;
  };

  const buttonClasses = activeTopicId
    ? isPaused
      ? 'border border-warning/35 bg-warning/15 text-warning hover:bg-warning/20'
      : 'border border-primary/35 bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse'
    : 'border border-border/60 bg-control text-content-muted hover:border-primary/25 hover:bg-primary/10 hover:text-primary';

  const feedbackClasses = justReturned
    ? 'border border-primary/40 bg-primary/15 text-primary animate-pulse'
    : '';

  return (
    <>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 transition-colors duration-200 focus:outline-none focus:ring-0 group lg:h-10 ${justReturned ? feedbackClasses : buttonClasses}`}
        style={activeTopicId && !justReturned && !isPaused ? { animationDuration: '3s' } : {}}
        title={getTitle()}
      >
        <Hourglass
          className={`w-3.5 h-3.5 transition-transform duration-500 ${activeTopicId && !isPaused ? 'group-hover:rotate-180' : ''
            }`}
        />
        <span className="text-[11px] font-bold tracking-wide flex items-center gap-1 uppercase">
          {activeTopicId ? (
            <>
              <span className="font-mono tabular-nums tracking-normal text-xs">{displayTime}</span>
              {isPaused && <span>(Pausa)</span>}
            </>
          ) : (
            'Iniciar'
          )}
        </span>
      </button>

      {/* Focus Modal */}
      <FocusModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        time={displayTime}
        topicName={topicDisplay}
        subjectName={subjectDisplay}
        isPaused={!!isPaused}
        onTogglePause={handleTogglePause}
        onStopAndEvaluate={handleStopAndEvaluate}
        onTogglePiP={isSupported ? handleTogglePiP : undefined}
      />

      {/* Elementos do PiP Standard — apenas para Chrome/Edge/Firefox.
           NÃO podem ter display:none para não bloquear requestPictureInPicture().
           Visibilidade via position:absolute + width/height 1px. */}
      {isSupported && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <canvas ref={canvasRef} />
          <video ref={videoRef} muted playsInline />
        </div>
      )}
    </>
  );
};
