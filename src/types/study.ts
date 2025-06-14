export enum ReviewProfile {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export interface ReviewIntervals {
  intervals: number[]; // dias entre cada revisão
  maxReviews: number; // número máximo de revisões
}

export const REVIEW_PROFILES: Record<ReviewProfile, ReviewIntervals> = {
  [ReviewProfile.BEGINNER]: {
    intervals: [1, 3, 7, 15, 30, 60],
    maxReviews: 6
  },
  [ReviewProfile.INTERMEDIATE]: {
    intervals: [1, 7, 15, 30],
    maxReviews: 4
  },
  [ReviewProfile.ADVANCED]: {
    intervals: [1, 7, 30],
    maxReviews: 3
  }
};

export interface UserSettings {
  id: string;
  user_id: string;
  review_profile: ReviewProfile;
  subjects_per_day: number;
  notifications_enabled: boolean;
  notification_time: string;
  created_at: string;
  updated_at: string;
} 