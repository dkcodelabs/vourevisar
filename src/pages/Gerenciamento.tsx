// =====================================================
// PÁGINA GERENCIAMENTO - TODAS AS FUNÇÕES ADMINISTRATIVAS
// =====================================================
import React, { useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly, OwnerOnly } from '@/components/ProtectedComponent'
import { UserManagementModal } from '@/components/UserManagementModal'
import { ProfileTester } from '@/components/ProfileTester'
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats'

export default function Gerenciamento() {
  const { user, isOwner, isAdmin, loading } = useUserRole()
  const [activeSection, setActiveSection] = useState('usuarios')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    mode: 'list' | 'assign' | 'manage'
    title: string
  }>({
    isOpen: false,
    mode: 'list',
    title: ''
  })

  const openModal = (mode: 'list' | 'assign' | 'manage', title: string) => {
    setModalState({ isOpen: true, mode, title })
  }

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'list', title: '' })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Carregando painel de gerenciamento...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Acesso Negado!</strong> Você precisa ser administrador para acessar esta página.
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                ⚙️ Gerenciamento do Sistema
              </h1>
              <p style={{ margin: 0, color: '#64748b' }}>
                Painel administrativo para gerenciar usuários, configurações e sistema
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>{user?.email}</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                isOwner ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isOwner ? '👑 Owner' : '🛡️ Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
          
          {/* Sidebar de Navegação */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            height: 'fit-content'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              📋 Seções
            </div>
            
            <div style={{ padding: '8px' }}>
              {/* Seções para Admins */}
              <AdminOnly>
                <SidebarItem
                  icon="👥"
                  label="Gerenciar Usuários"
                  active={activeSection === 'usuarios'}
                  onClick={() => setActiveSection('usuarios')}
                />
                <SidebarItem
                  icon="📊"
                  label="Relatórios"
                  active={activeSection === 'relatorios'}
                  onClick={() => setActiveSection('relatorios')}
                />
                <SidebarItem
                  icon="🔧"
                  label="Configurações"
                  active={activeSection === 'configuracoes'}
                  onClick={() => setActiveSection('configuracoes')}
                />
                <SidebarItem
                  icon="📚"
                  label="Documentação"
                  active={activeSection === 'documentacao'}
                  onClick={() => setActiveSection('documentacao')}
                />
                <SidebarItem
                  icon="💳"
                  label="Assinaturas"
                  active={activeSection === 'assinaturas'}
                  onClick={() => setActiveSection('assinaturas')}
                />
                <SidebarItem
                  icon="🧪"
                  label="Teste Sistema"
                  active={activeSection === 'teste'}
                  onClick={() => setActiveSection('teste')}
                />
              </AdminOnly>

              {/* Seções EXCLUSIVAS para Owners */}
              <OwnerOnly>
                <div style={{
                  height: '1px',
                  background: '#e2e8f0',
                  margin: '8px 12px'
                }} />
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#7c3aed',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  👑 Proprietário
                </div>
                <SidebarItem
                  icon="🔑"
                  label="Gerenciar Roles"
                  active={activeSection === 'roles'}
                  onClick={() => setActiveSection('roles')}
                  isOwnerOnly={true}
                />
                <SidebarItem
                  icon="⚙️"
                  label="Sistema"
                  active={activeSection === 'sistema'}
                  onClick={() => setActiveSection('sistema')}
                  isOwnerOnly={true}
                />
                <SidebarItem
                  icon="🗄️"
                  label="Backup"
                  active={activeSection === 'backup'}
                  onClick={() => setActiveSection('backup')}
                  isOwnerOnly={true}
                />
              </OwnerOnly>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '24px'
          }}>
            {activeSection === 'usuarios' && <UsuariosSection openModal={openModal} />}
            {activeSection === 'relatorios' && <RelatoriosSection openModal={openModal} />}
            {activeSection === 'configuracoes' && <ConfiguracoesSection openModal={openModal} />}
            {activeSection === 'documentacao' && <DocumentacaoSection openModal={openModal} />}
            {activeSection === 'assinaturas' && <AssinaturasSection openModal={openModal} />}
            {activeSection === 'teste' && <TesteSection openModal={openModal} />}
            {activeSection === 'roles' && <RolesSection openModal={openModal} />}
            {activeSection === 'sistema' && <SistemaSection openModal={openModal} />}
            {activeSection === 'backup' && <BackupSection openModal={openModal} />}
          </div>
        </div>
      </div>

      {/* Modal de Gerenciamento */}
      <UserManagementModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        mode={modalState.mode}
        title={modalState.title}
      />
    </div>
  )
}

// Componente para itens da sidebar
interface SidebarItemProps {
  icon: string
  label: string
  active: boolean
  onClick: () => void
  isOwnerOnly?: boolean
}

function SidebarItem({ icon, label, active, onClick, isOwnerOnly = false }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: active ? (isOwnerOnly ? '#faf5ff' : '#f0f9ff') : 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        color: active 
          ? (isOwnerOnly ? '#7c3aed' : '#0369a1') 
          : (isOwnerOnly ? '#7c3aed' : '#374151'),
        textAlign: 'left',
        margin: '2px 0'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// Seções de Conteúdo
function UsuariosSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          👥 Gerenciar Usuários
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Gerencie usuários, roles e permissões do sistema
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Visualização de Usuários */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👤 Visualização de Usuários
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Visualize todos os usuários cadastrados e suas roles atuais sem possibilidade de edição.
            </p>
          </div>
          
          <button
            onClick={() => openModal('list', '👥 Lista de Usuários (Somente Visualização)')}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            Listar Usuários
          </button>
        </div>

        {/* Gerenciamento Completo */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔧 Gerenciamento Completo
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Controle total sobre usuários - atribuir e remover qualquer role. Use com cuidado!
            </p>
          </div>
          
          <button
            onClick={() => openModal('manage', '🔧 Gerenciar Roles dos Usuários')}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
          >
            Gerenciar Roles
          </button>
        </div>

        {/* Atribuição Segura */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ➕ Atribuição Segura
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Apenas atribua novas roles aos usuários, sem risco de remover permissões existentes.
            </p>
          </div>
          
          <button
            onClick={() => openModal('assign', '➕ Atribuir Novas Permissões')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
          >
            Atribuir Permissões
          </button>
        </div>

      </div>
    </div>
  )
}

function RelatoriosSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          📊 Relatórios do Sistema
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Métricas e estatísticas para administradores
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Usuários Ativos */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👥 Usuários Ativos
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Total de usuários cadastrados
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Usuários ativos nos últimos 30 dias
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Taxa de conversão trial → pago
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Distribuição por planos
            </div>
          </div>
        </div>

        {/* Receita */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Receita
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Receita mensal recorrente (MRR)
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Receita anual recorrente (ARR)
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Churn rate (cancelamentos)
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Lifetime value (LTV)
            </div>
          </div>
        </div>

        {/* Engajamento */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📈 Engajamento
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Sessões de estudo por usuário
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Tempo médio de uso
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Funcionalidades mais usadas
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Taxa de retenção
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚠️ Alertas
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Trials expirando em 24h
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Assinaturas com falha de pagamento
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Usuários inativos há 7+ dias
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • Picos de cancelamento
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function ConfiguracoesSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          ⚙️ Configurações do Sistema
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Parâmetros e configurações administrativas
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Configurações de Assinatura */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Configurações de Assinatura
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Duração do Trial
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Atualmente: 7 dias
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Preço Mensal
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Atualmente: R$ 29,90
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Preço Anual
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Atualmente: R$ 299,90
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Desconto Anual
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Atualmente: 17%
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de Sistema */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🛡️ Configurações de Sistema
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Registro de Novos Usuários
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Permitir que novos usuários se cadastrem
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0'
              }}>
                Ativo
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Modo Manutenção
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Bloquear acesso para manutenção
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#6b7280',
                background: '#f8fafc',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0'
              }}>
                Inativo
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Backup Automático
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Backup diário dos dados
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0'
              }}>
                Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Configurações de Notificação */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔔 Configurações de Notificação
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Avisos de Trial Expirando
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Notificar 3 dias antes do fim
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0'
              }}>
                Ativo
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Emails de Cobrança
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Lembrar sobre pagamentos pendentes
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0'
              }}>
                Ativo
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Relatórios Semanais
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Enviar resumo semanal para admins
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0'
              }}>
                Ativo
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function DocumentacaoSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          📚 Documentação Técnica do Sistema
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Documentação interna para administradores - Como o sistema funciona e foi construído
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Sistema de Roles */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔐 Sistema de Roles e Permissões
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  👑 Owner (Proprietário)
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Acesso total e irrestrito - Pode criar outros owners
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  <strong>Pode fazer:</strong> Controle absoluto, configurações críticas, backup, relatórios financeiros, gerenciar qualquer usuário
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  <strong>Na prática:</strong> Você como dono do negócio - controle total
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#7c3aed',
                background: '#faf5ff',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #e879f9'
              }}>
                Nível 4
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  🛡️ Admin (Administrador)
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Gerencia usuários e moderators - Não pode criar outros admins
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  <strong>Pode fazer:</strong> Gerenciar users/moderators, relatórios administrativos, suporte avançado
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                  <strong>NÃO pode:</strong> Criar admins, configurações críticas, backup
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  <strong>Na prática:</strong> Funcionário de confiança que ajuda no dia a dia
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#2563eb',
                background: '#eff6ff',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #93c5fd'
              }}>
                Nível 3
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  👮 Moderator (Moderador)
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Gerencia usuários comuns - Acesso limitado às configurações
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  <strong>Pode fazer:</strong> Gerenciar apenas users, relatórios básicos, suporte simples
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                  <strong>NÃO pode:</strong> Criar admins/moderators, dados financeiros, configurações
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  <strong>Na prática:</strong> Suporte básico, moderação, ajuda inicial
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#059669',
                background: '#ecfdf5',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #a7f3d0'
              }}>
                Nível 2
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  👤 User (Usuário)
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Role padrão - Sujeito às limitações de assinatura
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  <strong>Pode fazer:</strong> Usar funcionalidades de estudo, gerenciar próprio perfil
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                  <strong>Limitações:</strong> Sujeito a assinatura (trial/pago/expirado), sem acesso admin
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  <strong>Na prática:</strong> Seus clientes pagantes que usam o sistema
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6b7280',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                Nível 1
              </span>
            </div>
          </div>
        </div>

        {/* Aplicação Prática no Negócio */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💼 Aplicação Prática no Negócio
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                🚀 Cenário 1: Crescimento da Empresa
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                • <strong>Você (Owner):</strong> Controle total do negócio<br/>
                • <strong>Funcionário de confiança (Admin):</strong> Gerencia usuários e suporte<br/>
                • <strong>Estagiário (Moderator):</strong> Suporte básico aos clientes<br/>
                • <strong>Clientes (User):</strong> Pagam e usam o sistema para estudar
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                🔒 Cenário 2: Segurança
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                • <strong>Dados financeiros:</strong> Só owners veem receita, MRR, ARR<br/>
                • <strong>Configurações críticas:</strong> Só owners alteram preços e durações<br/>
                • <strong>Gerenciamento hierárquico:</strong> Cada nível só gerencia níveis inferiores<br/>
                • <strong>Backup crítico:</strong> Só owners têm acesso a funções de backup
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                📈 Cenário 3: Escalabilidade
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                • <strong>Delegação segura:</strong> Você pode delegar sem perder controle<br/>
                • <strong>Crescimento controlado:</strong> Funcionários têm acesso necessário sem riscos<br/>
                • <strong>Auditoria completa:</strong> Todas as ações são registradas<br/>
                • <strong>Flexibilidade:</strong> Sistema cresce mantendo segurança
              </div>
            </div>
          </div>
        </div>

        {/* Sistema de Assinaturas */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💳 Sistema de Assinaturas
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  🆓 Free Trial
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  7 dias de acesso completo - Criado automaticamente
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#d97706',
                background: '#fef3c7',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #fcd34d'
              }}>
                R$ 0,00
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  💰 Monthly
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Renovação automática - Suporte prioritário
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#2563eb',
                background: '#dbeafe',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #93c5fd'
              }}>
                R$ 29,90/mês
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  💎 Annual
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  17% de desconto - Funcionalidades exclusivas
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#7c3aed',
                background: '#f3e8ff',
                padding: '4px 8px',
                borderRadius: '12px',
                border: '1px solid #c4b5fd'
              }}>
                R$ 299,90/ano
              </span>
            </div>
          </div>
        </div>

        {/* Arquitetura Técnica */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🏗️ Arquitetura Técnica
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • <strong>Banco de Dados:</strong> user_roles, user_subscriptions, payment_history
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • <strong>Segurança:</strong> RLS (Row Level Security) ativo em todas as tabelas
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • <strong>Frontend:</strong> useUserRole, useSubscription, ProtectedComponent
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • <strong>Funções SQL:</strong> has_active_subscription(), assign_user_role_admin()
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              • <strong>Triggers:</strong> Auto-atribuição de roles para novos usuários
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function AssinaturasSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  const stats = useSubscriptionStats()
  
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          💳 Gerenciar Assinaturas
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Controle de assinaturas e planos dos usuários - Teste Free vs Assinante
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Teste do Sistema Integrado */}
        <div style={{ 
          background: '#ffffff', 
          border: '2px solid #3b82f6', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🧪 Teste do Sistema Integrado - Role + Assinatura
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              <strong>TESTE COMPLETO:</strong> Verifique se o badge na barra superior atualiza automaticamente quando você alterar assinaturas.
            </p>
            <div style={{ fontSize: '12px', color: '#374151', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <strong>Como testar:</strong><br/>
              1. Observe o badge atual na barra superior<br/>
              2. Altere sua assinatura no modal abaixo<br/>
              3. Veja se o badge atualiza automaticamente<br/>
              4. Teste também o componente de teste detalhado
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openModal('manage', '💳 Gerenciar Assinaturas dos Usuários')}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
            >
              Gerenciar Assinaturas
            </button>
            
            <button
              onClick={() => {
                // Abrir componente de teste em nova aba
                const testWindow = window.open('', '_blank', 'width=800,height=600');
                if (testWindow) {
                  testWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Teste do Sistema Integrado</title>
                      <style>
                        body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }
                        .container { max-width: 800px; margin: 0 auto; }
                        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
                        .purple { background: #faf5ff; color: #7c3aed; border: 1px solid #e879f9; }
                        .blue { background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; }
                        .green { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
                        .yellow { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
                        .gray { background: #f8fafc; color: #6b7280; border: 1px solid #e2e8f0; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="card">
                          <h2>🧪 Teste do Sistema Integrado</h2>
                          <p>Este é um teste para verificar se o sistema está funcionando corretamente.</p>
                          
                          <h3>Badges de Exemplo:</h3>
                          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;">
                            <span class="badge purple">👑 Proprietário</span>
                            <span class="badge blue">🛡️ Administrador</span>
                            <span class="badge green">👮 Moderador</span>
                            <span class="badge blue">💰 Mensal</span>
                            <span class="badge purple">💎 Anual</span>
                            <span class="badge yellow">🆓 Trial (7d)</span>
                            <span class="badge gray">👤 Free</span>
                          </div>
                          
                          <h3>Instruções:</h3>
                          <ol>
                            <li>Volte para a página principal</li>
                            <li>Observe o badge na barra superior</li>
                            <li>Altere sua assinatura no modal de gerenciamento</li>
                            <li>Veja se o badge atualiza automaticamente</li>
                          </ol>
                          
                          <p><strong>Resultado esperado:</strong> O badge deve mudar instantaneamente quando você alterar a assinatura.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `);
                }
              }}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              🧪 Abrir Teste Detalhado
            </button>
          </div>
        </div>

        {/* Gerenciar Assinaturas de Usuários */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👥 Visualização Completa de Usuários
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Visualize todos os usuários e seus status de assinatura. Ative/desative assinaturas para teste.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => openModal('manage', '💳 Gerenciar Assinaturas dos Usuários')}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
            >
              Gerenciar Assinaturas
            </button>
            
            <button
              onClick={() => {
                console.log('🔄 PAGE: Refreshing stats...')
                stats.refresh()
              }}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              📊 Atualizar Stats
            </button>
          </div>
        </div>

        {/* Estatísticas de Assinaturas */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Estatísticas de Assinaturas
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>
                {stats.loading ? '...' : stats.freeActiveUsers}
              </div>
              <div style={{ fontSize: '14px', color: '#d97706' }}>
                Free (7d)
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
                {stats.loading ? '...' : stats.monthlyUsers}
              </div>
              <div style={{ fontSize: '14px', color: '#2563eb' }}>
                Mensal
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px', background: '#f3e8ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed', marginBottom: '4px' }}>
                {stats.loading ? '...' : stats.annualUsers}
              </div>
              <div style={{ fontSize: '14px', color: '#7c3aed' }}>
                Anual
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                {stats.loading ? '...' : stats.expiredUsers}
              </div>
              <div style={{ fontSize: '14px', color: '#dc2626' }}>
                Expirados
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚡ Ações Rápidas de Teste
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <ActionCard
              icon="🆓"
              title="Tornar Usuário Free"
              description="Remove assinatura ativa"
              onClick={() => alert('🆓 Função: Tornar Free - Em desenvolvimento')}
            />
            <ActionCard
              icon="✅"
              title="Ativar Assinatura"
              description="Torna usuário assinante"
              onClick={() => alert('✅ Função: Ativar Assinatura - Em desenvolvimento')}
            />
            <ActionCard
              icon="🔄"
              title="Renovar Trial"
              description="Reinicia período de teste"
              onClick={() => alert('🔄 Função: Renovar Trial - Em desenvolvimento')}
            />
            <ActionCard
              icon="📋"
              title="Relatório Completo"
              description="Exportar dados de assinaturas"
              onClick={() => alert('📋 Função: Relatório - Em desenvolvimento')}
            />
          </div>
        </div>

        {/* Configurações de Planos */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚙️ Configurações de Planos
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  🆓 Trial Gratuito
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Duração padrão para novos usuários
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#d97706',
                background: '#fef3c7',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #fcd34d'
              }}>
                7 dias
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  💰 Plano Mensal
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Renovação automática mensal
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#2563eb',
                background: '#dbeafe',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #93c5fd'
              }}>
                R$ 29,90
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  💎 Plano Anual
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  17% de desconto vs mensal
                </div>
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#7c3aed',
                background: '#f3e8ff',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid #c4b5fd'
              }}>
                R$ 299,90
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function TesteSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
          🧪 Teste Completo do Sistema
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Teste integrado de roles + assinaturas - Verifique se o badge atualiza automaticamente
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <ProfileTester />
      </div>

      <div style={{ 
        background: '#ffffff', 
        border: '2px solid #059669', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✅ Instruções de Teste
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9', 
            borderRadius: '8px', 
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0369a1', fontSize: '16px', fontWeight: '600' }}>
              🎯 Teste Principal: Badge Automático
            </h4>
            <ol style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
              <li>Observe o badge atual na barra superior (deve mostrar seu status atual)</li>
              <li>Vá para a seção "Assinaturas" → "Gerenciar Assinaturas"</li>
              <li>Altere sua própria assinatura (ex: de Free para Mensal)</li>
              <li>Volte para esta página e veja se o badge atualizou automaticamente</li>
              <li>Teste também o componente acima - deve mostrar as mesmas informações</li>
            </ol>
          </div>
          
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px', 
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#d97706', fontSize: '16px', fontWeight: '600' }}>
              ⚡ Teste de Performance
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
              <li>O badge deve atualizar em menos de 2 segundos</li>
              <li>Não deve ser necessário recarregar a página</li>
              <li>O componente de teste deve mostrar logs no console</li>
              <li>Todas as informações devem ser consistentes</li>
            </ul>
          </div>
          
          <div style={{ 
            background: '#ecfdf5', 
            border: '1px solid #10b981', 
            borderRadius: '8px', 
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: '16px', fontWeight: '600' }}>
              🏆 Resultado Esperado
            </h4>
            <div style={{ color: '#374151' }}>
              <strong>Prioridade do Badge:</strong><br/>
              1. Owner/Admin/Moderador (sempre aparecem primeiro)<br/>
              2. Assinatura Anual → "Anual" (roxo)<br/>
              3. Assinatura Mensal → "Mensal" (azul)<br/>
              4. Trial Ativo → "Trial (Xd)" (amarelo)<br/>
              5. Sem assinatura → "Free" (cinza)
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => openModal('manage', '💳 Gerenciar Assinaturas dos Usuários')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
          >
            Ir para Gerenciar Assinaturas
          </button>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
          >
            🔄 Recarregar Página
          </button>
        </div>
      </div>
    </div>
  )
}

function RolesSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <OwnerOnly>
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: '#7c3aed' }}>🔑 Gerenciar Roles</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Controle total sobre roles e permissões do sistema.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ActionCard
            icon="👑"
            title="Gerenciar Owners"
            description="Atribuir/remover proprietários"
            onClick={() => openModal('manage', '👑 Gerenciar Proprietários (OWNER ONLY)')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="🛡️"
            title="Gerenciar Admins"
            description="Adicionar/remover administradores"
            onClick={() => openModal('manage', '🛡️ Gerenciar Administradores (OWNER ONLY)')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="📋"
            title="Todos os Usuários"
            description="Controle total de permissões"
            onClick={() => openModal('manage', '📋 Controle Total de Usuários (OWNER ONLY)')}
            isOwnerOnly={true}
          />
        </div>
      </div>
    </OwnerOnly>
  )
}

function SistemaSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <OwnerOnly>
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: '#7c3aed' }}>⚙️ Sistema</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Configurações críticas do sistema (apenas proprietário).
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ActionCard
            icon="🔧"
            title="Configurações Avançadas"
            description="Parâmetros críticos"
            onClick={() => alert('⚙️ Função: Configurações Avançadas')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="🗄️"
            title="Banco de Dados"
            description="Gerenciar banco de dados"
            onClick={() => alert('⚙️ Função: Banco de Dados')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="🔒"
            title="Segurança Avançada"
            description="Configurações de segurança"
            onClick={() => alert('⚙️ Função: Segurança Avançada')}
            isOwnerOnly={true}
          />
        </div>
      </div>
    </OwnerOnly>
  )
}

function BackupSection({ openModal }: { openModal: (mode: 'list' | 'assign' | 'manage', title: string) => void }) {
  return (
    <OwnerOnly>
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: '#7c3aed' }}>🗄️ Backup</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Gerenciar backups e restauração do sistema.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ActionCard
            icon="💾"
            title="Criar Backup"
            description="Fazer backup completo"
            onClick={() => alert('🗄️ Função: Criar Backup')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="📥"
            title="Restaurar Backup"
            description="Restaurar sistema"
            onClick={() => alert('🗄️ Função: Restaurar Backup')}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="📅"
            title="Backups Automáticos"
            description="Configurar backups automáticos"
            onClick={() => alert('🗄️ Função: Backups Automáticos')}
            isOwnerOnly={true}
          />
        </div>
      </div>
    </OwnerOnly>
  )
}

// Componente para cards de ação
interface ActionCardProps {
  icon: string
  title: string
  description: string
  onClick: () => void
  isOwnerOnly?: boolean
}

function ActionCard({ icon, title, description, onClick, isOwnerOnly = false }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: `1px solid ${isOwnerOnly ? '#e879f9' : '#e2e8f0'}`,
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isOwnerOnly ? '#c084fc' : '#3b82f6'
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isOwnerOnly ? '#e879f9' : '#e2e8f0'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <h3 style={{ 
        margin: '0 0 4px 0', 
        fontSize: '16px', 
        fontWeight: '600',
        color: isOwnerOnly ? '#7c3aed' : '#1e293b'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: 0, 
        fontSize: '14px', 
        color: '#64748b' 
      }}>
        {description}
      </p>
    </button>
  )
}