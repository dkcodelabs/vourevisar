import { useState, useEffect, useRef } from 'react';

/**
 * Hook para gerenciar refreshes baseado na visibilidade da aba
 * Pausa refreshes quando usuário sai da aba/programa
 * Retoma quando volta para a aba
 */
export const useVisibilityRefresh = () => {
  const [isRefreshPaused, setIsRefreshPaused] = useState(false);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Usuário saiu da aba - pausar todos os refreshes
        console.log('👁️ Aba perdeu foco - pausando refreshes');
        setIsRefreshPaused(true);
        wasHiddenRef.current = true;
      } else {
        // Usuário voltou para a aba
        if (wasHiddenRef.current) {
          console.log('👁️ Aba ganhou foco - retomando refreshes');
          // Pequeno delay para evitar múltiplos refreshes simultâneos
          setTimeout(() => {
            setIsRefreshPaused(false);
            wasHiddenRef.current = false;
          }, 500);
        }
      }
    };

    // Detectar mudanças de visibilidade da aba
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Detectar quando janela perde/ganha foco (para casos de Alt+Tab)
    const handleFocus = () => {
      if (wasHiddenRef.current) {
        console.log('👁️ Janela ganhou foco - retomando refreshes');
        setTimeout(() => {
          setIsRefreshPaused(false);
          wasHiddenRef.current = false;
        }, 500);
      }
    };

    const handleBlur = () => {
      console.log('👁️ Janela perdeu foco - pausando refreshes');
      setIsRefreshPaused(true);
      wasHiddenRef.current = true;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  /**
   * Função para executar refresh apenas se não estiver pausado
   * @param refreshFn Função de refresh a ser executada
   * @param forceRefresh Se true, executa mesmo se pausado (para navegação interna)
   */
  const executeRefresh = (refreshFn: () => void | Promise<void>, forceRefresh = false) => {
    if (isRefreshPaused && !forceRefresh) {
      console.log('🚫 Refresh bloqueado - aba não está visível');
      return;
    }
    
    console.log('✅ Executando refresh - aba está visível');
    refreshFn();
  };

  return {
    isRefreshPaused,
    executeRefresh
  };
};