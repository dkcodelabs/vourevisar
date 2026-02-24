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
  [ReviewProfile.BEGINNER]: <Star className="text-yellow-400 w-7 h-7" />,
  [ReviewProfile.INTERMEDIATE]: <Rocket className="text-blue-500 w-7 h-7" />,
  [ReviewProfile.ADVANCED]: <Medal className="text-emerald-500 w-7 h-7" />,
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="flex flex-col items-center gap-4 sm:grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">

      {Object.values(ReviewProfile).map((profileType) => {
        const profileConfig = REVIEW_PROFILES[profileType];
        const showIntervals = !isMobile || expanded[profileType];
        const isSelected = profile === profileType;

        return (
          <div
            key={profileType}
            className={`relative flex flex-col items-center justify-between w-full max-w-[240px] mx-auto p-3.5 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none
              bg-card/80 backdrop-blur-sm
              ${isSelected
                ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]'
                : 'border-border/50 hover:border-primary/40'
              }
              ${disabled ? 'opacity-50 pointer-events-none' : ''}
            `}
            onClick={() => handleProfileChange(profileType)}
            tabIndex={0}
            aria-pressed={isSelected}
            style={{ minHeight: 160 }}
          >
            <div className="flex flex-col items-center gap-1.5 mb-2 w-full">
              {profileIcons[profileType]}
              <span className="text-sm font-semibold text-foreground text-center">
                {profileType === ReviewProfile.BEGINNER && 'Iniciante'}
                {profileType === ReviewProfile.INTERMEDIATE && 'Intermediário'}
                {profileType === ReviewProfile.ADVANCED && 'Avançado'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed text-left w-full">
              {profileType === ReviewProfile.BEGINNER && 'Ideal para quem está começando e precisa de mais revisões para fixar o conteúdo.'}
              {profileType === ReviewProfile.INTERMEDIATE && 'Perfil padrão, com um bom equilíbrio entre revisões e progresso.'}
              {profileType === ReviewProfile.ADVANCED && 'Para quem já tem experiência e precisa de menos revisões para manter o conteúdo.'}
            </p>
            <div className="mt-1 w-full">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground/80 mb-1">Intervalos de revisão:</p>
                {isMobile && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] text-primary font-medium focus:outline-none"
                    onClick={e => { e.stopPropagation(); handleToggleExpand(profileType); }}
                  >
                    {expanded[profileType] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {expanded[profileType] ? 'Ocultar' : 'Ver'}
                  </button>
                )}
              </div>
              {showIntervals && (
                <ul className="space-y-0.5 text-[11px] text-muted-foreground list-disc list-inside pl-2">
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
              checked={isSelected}
              onChange={() => handleProfileChange(profileType)}
              className="absolute top-3 right-3 h-3.5 w-3.5 accent-[hsl(var(--primary))]"
              disabled={disabled}
              tabIndex={-1}
            />
          </div>
        );
      })}
    </div>
  );
}; 