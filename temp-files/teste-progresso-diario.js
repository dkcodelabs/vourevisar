// Teste do Progresso Diário - Execute no Console do Navegador (F12)
// Para testar se o sistema está funcionando corretamente

console.log('🧪 TESTE DO PROGRESSO DIÁRIO');
console.log('================================');

// 1. Verificar se os hooks estão carregados
const dailyProgressElement = document.querySelector('[class*="DailyStudyProgress"]');
if (dailyProgressElement) {
  console.log('✅ Componente DailyStudyProgress encontrado');
} else {
  console.log('❌ Componente DailyStudyProgress NÃO encontrado');
}

// 2. Verificar eventos
let eventCount = 0;
const testEventListener = (event) => {
  eventCount++;
  console.log(`🔔 Evento ${eventCount}: ${event.type}`, event.detail);
};

window.addEventListener('dailyProgressUpdated', testEventListener);
window.addEventListener('cycleUpdated', testEventListener);

console.log('📡 Event listeners adicionados. Agora:');
console.log('1. Marque alguns tópicos em uma matéria');
console.log('2. Clique em "Concluir Sessão"');
console.log('3. Observe os logs aqui no console');

// 3. Função para simular evento (teste)
window.testProgressEvent = () => {
  console.log('🧪 Simulando evento dailyProgressUpdated...');
  window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
    detail: { subjectId: 'test', subjectName: 'Teste' }
  }));
};

console.log('💡 Para testar manualmente, execute: testProgressEvent()');

// 4. Verificar estado atual do localStorage
const viewMode = localStorage.getItem('studyCycleViewMode');
console.log('📱 View Mode atual:', viewMode);

// 5. Função para limpar listeners (execute quando terminar)
window.cleanupTest = () => {
  window.removeEventListener('dailyProgressUpdated', testEventListener);
  window.removeEventListener('cycleUpdated', testEventListener);
  console.log('🧹 Event listeners removidos');
};