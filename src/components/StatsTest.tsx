// =====================================================
// TESTE RÁPIDO DAS ESTATÍSTICAS
// =====================================================
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats'

export function StatsTest() {
  const stats = useSubscriptionStats()

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-4">📊 Teste das Estatísticas</h3>
      
      {stats.loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Free (7d):</strong> {stats.freeActiveUsers}
          </div>
          <div>
            <strong>Mensal:</strong> {stats.monthlyUsers}
          </div>
          <div>
            <strong>Anual:</strong> {stats.annualUsers}
          </div>
          <div>
            <strong>Expirados:</strong> {stats.expiredUsers}
          </div>
          <div>
            <strong>Total:</strong> {stats.totalUsers}
          </div>
        </div>
      )}
      
      <button 
        onClick={() => stats.refresh()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        🔄 Atualizar
      </button>
    </div>
  )
}