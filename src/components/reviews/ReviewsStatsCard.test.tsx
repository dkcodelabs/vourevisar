import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewsStatsCard } from './ReviewsStatsCard';

describe('ReviewsStatsCard', () => {
  it('renders the canonical schedule summary without reclassifying it', () => {
    render(
      <ReviewsStatsCard
        totalTopics={82}
        totalScheduledReviews={3}
        startedTopicsCount={3}
        completedReviews={0}
        scheduledReviews={3}
        notStartedReviews={79}
        schedule={{ overdue: 0, today: 1, future: 2 }}
        protectionMode="Média"
        maxReviews={4}
      />,
    );

    expect(screen.getByText('Atraso').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Hoje').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Futuras').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Tópicos iniciados').parentElement?.parentElement).toHaveTextContent('3');
  });
});
