import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { usePiPTimer } from '@/hooks/usePiPTimer';

interface FocusTimerProps { }

export const FocusTimer: React.FC<FocusTimerProps> = () => {
  const navigate = useNavigate();
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  const [justReturned, setJustReturned] = useState(false);

  // Read active timer from localStorage
  useEffect(() => {
    const checkActiveTimer = () => {
      try {
        const saved = localStorage.getItem('revisoes-active-timer');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.topicId) {
            setActiveTopicId(parsed.topicId);

            // Calculate elapsed time
            if (parsed.startTime) {
              const diff = Date.now() - parsed.startTime;
              const minutes = Math.floor(diff / 60000); // Minutes
              setElapsedMinutes(minutes);
            } else {
              // If topicId exists but startTime doesn't, reset elapsed minutes
              setElapsedMinutes(0);
            }
          } else {
            // Reset if invalid
            setActiveTopicId(null);
            setElapsedMinutes(0);
          }
        } else {
          setActiveTopicId(null);
          setElapsedMinutes(0);
        }
      } catch (e) {
        console.error('Error reading active timer', e);
      }
    };

    checkActiveTimer();
    const interval = setInterval(checkActiveTimer, 1000); // Check every second for minute updates
    return () => clearInterval(interval);
  }, []);

  const { canvasRef, videoRef, togglePiP, isSupported } = usePiPTimer({
    minutes: elapsedMinutes,
    isActive: !!activeTopicId
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
      navigate(`/revisoes?topicId=${activeTopicId}`);
      // Recursive scroll logic
      setTimeout(() => scrollToTopic(activeTopicId), 100);
    } else {
      navigate('/revisoes');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isSupported) {
      e.stopPropagation(); // Prevent navigation trigger if needed, though click fires before dblclick usually
      e.preventDefault();
      togglePiP();
    }
  };

  const scrollToTopic = (topicId: string, attempt = 1) => {
    if (attempt > 20) return;
    const element = document.getElementById(`topic-${topicId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTimeout(() => scrollToTopic(topicId, attempt + 1), 200);
    }
  };

  const getTitle = () => {
    const base = activeTopicId ? "Ir para tópico ativo" : "Iniciar revisão";
    if (isSupported) {
      return `${base} | Duplo Clique: Janela Flutuante`;
    }
    return base;
  };

  const buttonClasses = activeTopicId
    ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg animate-pulse'
    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400';

  const feedbackClasses = justReturned
    ? 'ring-4 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-100 text-indigo-900'
    : '';

  return (
    <>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-0 active:scale-95 group ${justReturned ? feedbackClasses : buttonClasses
          }`}
        style={activeTopicId && !justReturned ? { animationDuration: '3s' } : {}}
        title={getTitle()}
      >
        <Hourglass className={`w-3.5 h-3.5 transition-transform duration-500 ${activeTopicId ? 'group-hover:rotate-180' : ''}`} />
        <span className="text-xs font-bold font-mono tracking-wide">
          {activeTopicId ? `${elapsedMinutes} min` : "Iniciar"}
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
