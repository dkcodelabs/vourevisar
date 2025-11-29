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

    // Formato inline: "3/4 - texto"
    const displayText = (reviewCount !== undefined && maxReviews !== undefined && status !== RevisionStatus.COMPLETED)
        ? `${reviewCount}/${maxReviews} - ${text}`
        : text;

    return (
        <div className={`w-full flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${bgClass}`}>
            {displayText}
        </div>
    );
};
