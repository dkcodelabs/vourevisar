
import React from 'react';
import { SessionNode, SessionStatus } from '../types';

interface TimelineItemProps {
  session: SessionNode;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ session }) => {
  const getStatusStyles = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.COMPLETED:
        return {
          dot: 'bg-brand-green border-brand-green',
          text: 'text-brand-green'
        };
      case SessionStatus.DELAYED:
        return {
          dot: 'bg-brand-red border-brand-red',
          text: 'text-brand-red'
        };
      case SessionStatus.TODAY:
        return {
          dot: 'bg-brand-gold border-brand-gold shadow-[0_0_8px_rgba(245,158,11,0.6)]',
          text: 'text-brand-gold shadow-amber-500/40'
        };
      case SessionStatus.FUTURE:
      default:
        return {
          dot: 'bg-line-main border-bg-card',
          text: 'text-text-muted'
        };
    }
  };

  const styles = getStatusStyles(session.status);

  return (
    <div className="relative flex justify-between items-start mb-6 last:mb-0 z-10">
      <div className={`absolute left-[1.5px] top-1.5 w-[7px] h-[7px] rounded-full border ${styles.dot}`}></div>
      <div className="pl-6 flex flex-col">
        <span className="text-[11px] font-semibold text-white leading-tight">{session.label}</span>
        <span className="text-[10px] text-text-muted mt-0.5">{session.date}</span>
      </div>
      <div className={`text-[11px] font-medium ${styles.text}`}>
        {session.meta || (session.status === SessionStatus.TODAY ? 'Hoje' : session.status === SessionStatus.FUTURE ? 'Futuro' : '')}
      </div>
    </div>
  );
};

export default TimelineItem;
