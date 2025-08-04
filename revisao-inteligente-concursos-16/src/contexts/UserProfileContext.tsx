import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReviewProfile } from '../types/study';

interface UserProfileContextData {
  profile: ReviewProfile;
  setProfile: (profile: ReviewProfile) => void;
}

const UserProfileContext = createContext<UserProfileContextData>({} as UserProfileContextData);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ReviewProfile>(ReviewProfile.INTERMEDIATE);

  return (
    <UserProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
} 