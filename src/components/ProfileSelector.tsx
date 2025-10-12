import React, { useState } from 'react';
import { useUserProfile } from '../contexts/UserProfileContext';
import { ReviewProfile, REVIEW_PROFILES } from '../types/study';
import { Star, Rocket, Medal, ChevronDown, ChevronUp } from 'lucide-react';

interface ProfileSelectorProps {
  selected?: ReviewProfile | null;
  onSelect?: (profile: ReviewProfile) => void;
  onboarding?: boolean;
  disabled?: boolean;
}

const profileIcons = {
  [ReviewProfile.BEGINNER]: <Star className="text-yellow-400 w-8 h-8" />,
  [ReviewProfile.INTERMEDIATE]: <Rocket className="text-blue-500 w-8 h-8" />,
  [ReviewProfile.ADVANCED]: <Medal className="text-green-500 w-8 h-8" />,
};

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ selected, onSelect, onboarding, disabled }) => {
  const context = useUserProfile();
  const profile = selected ?? context.profile;
  const setProfile = onSelect ?? context.setProfile;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleProfileChange = (newProfile: ReviewProfile) => {
    if (disabled) return;
    setProfile(newProfile);
  };

  const handleToggleExpand = (profileType: string) => {
    setExpanded((prev) => ({ ...prev, [profileType]: !prev[profileType] }));
  };

  // Detectar se é mobile/tablet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="flex flex-col items-center gap-6 sm:grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">

      {Object.values(ReviewProfile).map((profileType) => {
        const profileConfig = REVIEW_PROFILES[profileType];
        const showIntervals = !isMobile || expanded[profileType];
        return (
          <div
            key={profileType}
            className={`relative flex flex-col items-center justify-between w-full max-w-[260px] mx-auto p-4 rounded-2xl border transition-all duration-200 bg-white shadow-sm cursor-pointer focus:outline-none
              ${profile === profileType ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg scale-[1.03]' : 'border-gray-200 hover:border-blue-300'}
              ${disabled ? 'opacity-60 pointer-events-none' : ''}
            `}
            onClick={() => handleProfileChange(profileType)}
            tabIndex={0}
            aria-pressed={profile === profileType}
            style={{ minHeight: 180 }}
          >
            <div className="flex flex-col items-center gap-2 mb-2 w-full">
              {profileIcons[profileType]}
              <span className="text-base font-semibold text-gray-900 text-center">
                {profileType === ReviewProfile.BEGINNER && 'Iniciante'}
                {profileType === ReviewProfile.INTERMEDIATE && 'Intermediário'}
                {profileType === ReviewProfile.ADVANCED && 'Avançado'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2 leading-relaxed text-left w-full">
              {profileType === ReviewProfile.BEGINNER && 'Ideal para quem está começando e precisa de mais revisões para fixar o conteúdo.'}
              {profileType === ReviewProfile.INTERMEDIATE && 'Perfil padrão, com um bom equilíbrio entre revisões e progresso.'}
              {profileType === ReviewProfile.ADVANCED && 'Para quem já tem experiência e precisa de menos revisões para manter o conteúdo.'}
            </p>
            <div className="mt-1 w-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 mb-1">Intervalos de revisão:</p>
                {isMobile && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-blue-600 font-medium focus:outline-none"
                    onClick={e => { e.stopPropagation(); handleToggleExpand(profileType); }}
                  >
                    {expanded[profileType] ? <ChevronUp /> : <ChevronDown />}
                    {expanded[profileType] ? 'Ocultar' : 'Ver'}
                  </button>
                )}
              </div>
              {showIntervals && (
                <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside pl-2">
                  {profileConfig.intervals.map((interval, index) => (
                    <li key={index} className="pl-1">
                      {index + 1}ª revisão: {interval} dias
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="radio"
              id={profileType}
              name="profile"
              checked={profile === profileType}
              onChange={() => handleProfileChange(profileType)}
              className="absolute top-3 right-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
              tabIndex={-1}
            />
            {profile === profileType && !disabled && (
              <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">Selecionado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}; 