import React from 'react';
import { RevisionStatus } from '@/types/revision';

interface StatusBadgeProps {
    status: RevisionStatus;
    daysDiff: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, daysDiff }) => {
    let bgClass = '';
    let text = '';

    switch (status) {
        case RevisionStatus.OVERDUE:
            bgClass = 'bg-red-400 hover:bg-red-500';
            text = `Atrasado (${Math.abs(daysDiff)} dias)`;
            break;
        case RevisionStatus.TODAY:
            bgClass = 'bg-blue-400 hover:bg-blue-500';
            text = 'Para Hoje';
            break;
        case RevisionStatus.FUTURE:
            bgClass = 'bg-gray-400 hover:bg-gray-500';
            text = `Em ${daysDiff} dias`;
            break;
        case RevisionStatus.COMPLETED:
            bgClass = 'bg-green-400 hover:bg-green-500';
            text = 'Concluído';
            break;
    }

    return (
        <div className={`w-full h-8 flex items-center justify-center text-white text-xs font-medium transition-colors cursor-pointer ${bgClass}`}>
            {text}
        </div>
    );
};
