
import React, { useState } from 'react';
import { StudyTopic, SessionStatus } from '../types';
import TimelineItem from './TimelineItem';
import StarRating from './StarRating';
import { getStudyInsight } from '../services/geminiService';

interface StudyModalProps {
  topic: StudyTopic;
  onClose: () => void;
}

const StudyModal: React.FC<StudyModalProps> = ({ topic, onClose }) => {
  const [timeSpent, setTimeSpent] = useState(15);
  const [difficulty, setDifficulty] = useState(3);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    const tip = await getStudyInsight(topic.title, difficulty, timeSpent);
    setInsight(tip);
    setIsLoading(false);
  };

  return (
    <div className="w-[400px] bg-bg-card border border-border-main rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-5 pt-5 pb-4">
        <h1 className="text-[13px] font-bold text-white uppercase tracking-wider">{topic.title}</h1>
        <p className="text-[11px] text-text-muted mt-1 leading-snug line-clamp-1 italic">{topic.subtitle}</p>
      </header>

      {/* Timeline */}
      <div className="px-5 pb-6 relative">
        <div className="absolute left-[24px] top-0 bottom-6 w-[1px] bg-line-main"></div>
        <div className="flex flex-col">
          {topic.sessions.map((session) => (
            <TimelineItem key={session.id} session={session} />
          ))}
        </div>
      </div>

      {/* Insight Display if exists */}
      {insight && (
        <div className="mx-5 mb-5 p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-[11px] text-brand-gold leading-relaxed">
              <span className="font-bold">Dica IA:</span> {insight}
            </p>
          </div>
        </div>
      )}

      {/* Feedback Controls */}
      {!insight && (
        <div className="flex gap-4 p-5 border-t border-border-main">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">
              Tempo da Sessão
            </label>
            <div className="bg-bg-input border border-border-main rounded-lg px-3 py-2 flex items-center justify-between">
              <input
                type="number"
                value={timeSpent}
                onChange={(e) => setTimeSpent(Number(e.target.value))}
                className="bg-transparent border-none text-white text-[12px] font-bold w-full outline-none"
              />
              <span className="text-[11px] text-text-muted ml-1">min</span>
            </div>
          </div>

          <div className="flex-[1.5]">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">
              Dificuldade?
            </label>
            <StarRating rating={difficulty} onRatingChange={setDifficulty} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-5 py-4 border-t border-border-main bg-white/[0.02] flex justify-between items-center gap-3">
        <button 
          onClick={onClose}
          className="text-brand-red text-[12px] font-semibold hover:opacity-80 transition-opacity px-2 py-1"
        >
          {insight ? 'Fechar' : 'Cancelar'}
        </button>
        
        {!insight && (
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`bg-brand-green text-white px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2`}
          >
            {isLoading && (
              <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Confirmar Revisão
          </button>
        )}
      </footer>
    </div>
  );
};

export default StudyModal;
