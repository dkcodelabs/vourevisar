import React from 'react';
import { RevisionStatus } from '@/types/revision';

interface StatusBadgeProps {
    status: RevisionStatus;
    daysDiff: number;
    reviewCount?: number;
    maxReviews?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, daysDiff, reviewCount, maxReviews }) => {
    let bgClass = '';
    let text = '';

    switch (status) {
        case RevisionStatus.OVERDUE:
            bgClass = 'bg-red-100 text-red-700 hover:bg-red-200';
            text = `${Math.abs(daysDiff)} dias atraso`;
            break;
        case RevisionStatus.TODAY:
            bgClass = 'bg-orange-100 text-orange-700 hover:bg-orange-200';
            text = 'Para Hoje';
            break;
        case RevisionStatus.FUTURE:
            bgClass = 'bg-blue-100 text-blue-700 hover:bg-blue-200';
            text = `Em ${daysDiff} dias`;
            break;
        case RevisionStatus.COMPLETED:
            bgClass = 'bg-green-100 text-green-700 hover:bg-green-200';
            text = 'Concluído';
            break;
    }

    // Exibir em duas linhas se houver contador
    const hasCounter = reviewCount !== undefined && maxReviews !== undefined && status !== RevisionStatus.COMPLETED;

    return (
        <div className={`w-full flex flex-col items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${bgClass}`}>
            {hasCounter && (
                <div className="font-semibold text-[10px] leading-tight">{reviewCount}/{maxReviews}</div>
            )}
            <div className={hasCounter ? 'text-[10px] leading-tight' : ''}>{text}</div>
        </div>
    );
};
