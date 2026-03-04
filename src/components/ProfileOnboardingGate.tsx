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
  const [retryCount, setRetryCount] = useState(0);

  // Lista de rotas que requerem perfil definido
  const protectedRoutes = ['/materias', '/topicos', '/revisoes', '/revisao-geral', '/ciclo-estudos'];

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setShowOnboarding(false);
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);

      try {
        // Buscar perfil com retry em caso de erro de conectividade
        const { data, error } = await supabase
          .from('user_settings')
          .select('review_profile')
          .eq('user_id', user.id)
          .single();

        // Se houver erro, diferenciar entre "usuário não existe" e "erro real"
        if (error) {
          if (error.code === 'PGRST116') {
            // Nenhum registro encontrado. É um usuário novo legitímo. Segue o fluxo.
          } else {
            // Qualquer outro erro (timeout, instabilidade, internet)
            console.error('Erro real ao buscar perfil, abortando verificação:', error);
            setLoadingProfile(false);
            return;
          }
        }

        setProfile(data?.review_profile as ReviewProfile || null);

        // Checar se já existem revisões (com tratamento de erro)
        const { data: topics, error: topicsError } = await supabase
          .from('topics')
          .select('id, subject_id, subjects!inner(user_id)')
          .eq('subjects.user_id', user.id)
          .gt('review_count', 0)
          .limit(1);

        // Se erro de conectividade nas revisões, assumir que não tem
        if (topicsError && (topicsError.message?.includes('Failed to fetch') || topicsError.message?.includes('ERR_INTERNET_DISCONNECTED'))) {
          console.log('🌐 Problema de conectividade ao buscar revisões, assumindo que não tem');
          setHasReviews(false);
        } else {
          setHasReviews(topics && topics.length > 0);
        }

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
      } catch (error: any) {
        console.error('Erro inesperado ao verificar perfil:', error);
        // Em caso de exceção severa, NUNCA presuma que o usuário é novo. Isso previne modals indevidos.
        setShowOnboarding(false);
      } finally {
        setLoadingProfile(false);
      }
    };

    checkProfile();
  }, [user?.id, retryCount]); // Removido location.pathname para evitar loops

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