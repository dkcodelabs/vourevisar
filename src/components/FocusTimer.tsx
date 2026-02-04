import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { usePiPTimer } from '@/hooks/usePiPTimer';
import { useTimer } from '@/contexts/TimerContext';

interface FocusTimerProps { }

export const FocusTimer: React.FC<FocusTimerProps> = () => {
  const navigate = useNavigate();
  const { activeTimer } = useTimer();
  const [displayTime, setDisplayTime] = useState<string>("0min");
  const [justReturned, setJustReturned] = useState(false);

  // Calculate elapsed time from global context
  useEffect(() => {
    const updateTime = () => {
      if (activeTimer) {
        const now = Date.now();
        let totalMs = 0;

        if (activeTimer.status === 'PAUSED') {
          totalMs = activeTimer.accumulatedTime || 0;
        } else {
          const currentSession = activeTimer.startTime ? (now - activeTimer.startTime) : 0;
          totalMs = (activeTimer.accumulatedTime || 0) + currentSession;
        }

        if (totalMs < 60000) {
          const seconds = Math.floor(totalMs / 1000);
          setDisplayTime(`${seconds}seg`);
        } else {
          const minutes = Math.floor(totalMs / 60000);
          setDisplayTime(`${minutes}min`);
        }
      } else {
        setDisplayTime("0min");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const activeTopicId = activeTimer?.topicId || null;
  const isPaused = activeTimer?.status === 'PAUSED';

  const { canvasRef, videoRef, togglePiP, isSupported } = usePiPTimer({
    displayTime,
    isActive: !!activeTopicId && !isPaused // Only active in PiP if running
  });

  // Feedback effect for returning from PiP
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

  const handleClick = () => {
    if (activeTopicId) {
      navigate(`/revisoes?topicId=${activeTopicId}`, {
        state: { focusTopicId: activeTopicId }
      });
    } else {
      navigate('/revisoes');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isSupported && !isPaused) {
      e.stopPropagation();
      e.preventDefault();
      togglePiP();
    }
  };

  const getTitle = () => {
    const base = activeTopicId
      ? (isPaused ? "Revisão Pausada (Clique para retomar na lista)" : "Ir para tópico ativo")
      : "Iniciar revisão";

    if (isSupported && activeTopicId && !isPaused) {
      return `${base} | Duplo Clique: Janela Flutuante`;
    }
    return base;
  };

  const buttonClasses = activeTopicId
    ? (isPaused
      ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600' // Paused State: Orange, No Pulse
      : 'bg-indigo-600 text-white shadow-md hover:shadow-lg animate-pulse') // Running State
    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400';

  const feedbackClasses = justReturned
    ? 'ring-4 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-100 text-indigo-900'
    : '';

  return (
    <>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-0 active:scale-95 group ${justReturned ? feedbackClasses : buttonClasses}`}
        style={activeTopicId && !justReturned && !isPaused ? { animationDuration: '3s' } : {}}
        title={getTitle()}
      >
        <Hourglass className={`w-3.5 h-3.5 transition-transform duration-500 ${activeTopicId && !isPaused ? 'group-hover:rotate-180' : ''}`} />
        <span className="text-xs font-bold tracking-wide flex items-center gap-1">
          {activeTopicId ? (
            <>
              <span className="font-mono tabular-nums">{displayTime}</span>
              <span>{isPaused ? ' (Pausa)' : ''}</span>
            </>
          ) : (
            "Iniciar"
          )}
        </span>
      </button>

      {/* Hidden elements for PiP */}
      <div className="hidden">
        <canvas ref={canvasRef} />
        <video ref={videoRef} muted autoPlay playsInline />
      </div>
    </>
  );
};
