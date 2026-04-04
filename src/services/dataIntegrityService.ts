
/**
 * SERVIÇO DE INTEGRIDADE DE DADOS (DESATIVADO)
 * 
 * Este serviço foi desativado para evitar deleções automáticas de dados.
 * Matérias e tópicos agora são gerenciados exclusivamente por ações diretas do usuário.
 */

export const performGlobalCleanup = async () => {
  console.log('ℹ️ performGlobalCleanup: Ignorado (Serviço Desativado)');
  return;
};

export const cleanupUserOrphans = async (userId: string) => {
  console.log('ℹ️ cleanupUserOrphans: Ignorado (Serviço Desativado)', userId);
  return;
};
