import { useEffect, useState } from "react";
import { ProfileOnboardingModal } from "./ProfileOnboardingModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ReviewProfile } from "@/types/study";

export function ProfileOnboardingGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<ReviewProfile | null>(null);
  const [hasReviews, setHasReviews] = useState(false);

  // Lista de rotas que requerem perfil definido
  const protectedRoutes = ['/materias', '/topicos', '/revisoes', '/revisao-geral', '/ciclo-estudos'];

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      
      try {
        // Buscar perfil
        const { data } = await supabase
          .from('user_settings')
          .select('review_profile')
          .eq('user_id', user.id)
          .single();
        
        setProfile(data?.review_profile as ReviewProfile || null);
        
        // Checar se já existem revisões
        const { data: topics } = await supabase
          .from('topics')
          .select('id, subject_id, subjects!inner(user_id)')
          .eq('subjects.user_id', user.id)
          .gt('review_count', 0)
          .limit(1);
        
        setHasReviews(topics && topics.length > 0);
        
        // Verificar se está em uma rota protegida sem perfil
        const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));
        const needsProfile = !data?.review_profile || data?.review_profile === '';
        
        if (isProtectedRoute && needsProfile) {
          setShowOnboarding(true);
          // Não redirecionar se já estiver no onboarding
          if (!location.pathname.includes('configuracoes')) {
            navigate('/configuracoes');
          }
        } else {
          setShowOnboarding(needsProfile);
        }
      } catch (error) {
        console.error('Erro ao verificar perfil:', error);
        setShowOnboarding(true);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    checkProfile();
  }, [user, location.pathname]);

  const handleConfirmProfile = async (profile: ReviewProfile) => {
    if (!user || hasReviews) return;
    
    try {
      await supabase
        .from('user_settings')
        .update({ review_profile: profile })
        .eq('user_id', user.id);
      
      setProfile(profile);
      setShowOnboarding(false);
      
      // Se estiver em uma rota protegida, redirecionar para a página inicial
      if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  };

  const handleClose = async () => {
    if (hasReviews && user) {
      await supabase
        .from('user_settings')
        .update({ review_profile: ReviewProfile.INTERMEDIATE })
        .eq('user_id', user.id);
    }
    setShowOnboarding(false);
  };

  // Não mostrar loading se o usuário não estiver autenticado
  if (loadingProfile && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ProfileOnboardingModal
      open={showOnboarding}
      onConfirm={handleConfirmProfile}
      onClose={handleClose}
      selectedProfile={profile}
      disabled={hasReviews}
    />
  );
} 