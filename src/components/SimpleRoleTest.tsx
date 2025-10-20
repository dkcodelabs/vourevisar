// Teste simples para debugar o sistema de roles
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'

export function SimpleRoleTest() {
  const roleData = useUserRole()
  
  console.log('🔍 Role Data:', roleData)
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Debug do Sistema de Roles</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="font-semibold mb-2">📊 Estado Atual:</h2>
        <pre className="text-sm bg-white p-3 rounded border overflow-auto">
          {JSON.stringify(roleData, null, 2)}
        </pre>
      </div>

      <div className="space-y-3">
        <div className="p-3 border rounded">
          <strong>Loading:</strong> {roleData.loading ? '✅ Sim' : '❌ Não'}
        </div>
        
        <div className="p-3 border rounded">
          <strong>Error:</strong> {roleData.error || '✅ Nenhum erro'}
        </div>
        
        <div className="p-3 border rounded">
          <strong>User:</strong> {roleData.user?.email || '❌ Não logado'}
        </div>
        
        <div className="p-3 border rounded">
          <strong>Roles:</strong> {roleData.roles?.join(', ') || '❌ Nenhuma'}
        </div>
        
        <div className="p-3 border rounded">
          <strong>Is Owner:</strong> {roleData.isOwner ? '✅ Sim' : '❌ Não'}
        </div>
        
        <div className="p-3 border rounded">
          <strong>Is Admin:</strong> {roleData.isAdmin ? '✅ Sim' : '❌ Não'}
        </div>
      </div>

      <button 
        onClick={() => {
          console.log('🔄 Refetch roles...')
          roleData.refetch?.()
        }}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Recarregar Roles
      </button>
    </div>
  )
}