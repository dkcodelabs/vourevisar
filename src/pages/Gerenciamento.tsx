// =====================================================
// PÁGINA GERENCIAMENTO - TODAS AS FUNÇÕES ADMINISTRATIVAS
// =====================================================
import React, { useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly, OwnerOnly } from '@/components/ProtectedComponent'
import { UserRoleBadge, ProtectedButton } from '@/components/RoleBasedUI'
import { UserManagementModal } from '@/components/UserManagementModal'
import { SubscriptionManagementModal } from '@/components/SubscriptionManagementModal'

export default function Gerenciamento() {
  const { user, isOwner, isAdmin, loading } = useUserRole()
  const [activeSection, setActiveSection] = useState('usuarios')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalMode, setUserModalMode] = useState<'list' | 'assign' | 'manage'>('list')
  const [userModalTitle, setUserModalTitle] = useState('')
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)

  // Seções de Conteúdo (movidas para dentro do componente)
  const UsuariosSection = () => (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>👥 Gerenciar Usuários</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Gerencie usuários, roles e permissões do sistema.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <ActionCard
          icon="👤"
          title="Listar Usuários"
          description="Ver todos os usuários cadastrados"
          onClick={() => {
            setUserModalMode('list')
            setUserModalTitle('📋 Lista de Usuários')
            setUserModalOpen(true)
          }}
        />
        <ActionCard
          icon="🔧"
          title="Atribuir Permissões"
          description="Dar roles aos usuários"
          onClick={() => {
            setUserModalMode('assign')
            setUserModalTitle('➕ Atribuir Permissões')
            setUserModalOpen(true)
          }}
        />
        <ActionCard
          icon="⚙️"
          title="Gerenciar Permissões"
          description="Alterar/remover roles dos usuários"
          onClick={() => {
            setUserModalMode('manage')
            setUserModalTitle('🔧 Gerenciar Permissões')
            setUserModalOpen(true)
          }}
        />
      </div>
    </div>
  )

  const AssinaturasSection = () => (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>💳 Gerenciar Assinaturas</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Gerencie os tipos de conta dos usuários (Free, Mensal, Anual).
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <ActionCard
          icon="💳"
          title="Gerenciar Assinaturas"
          description="Ativar/desativar planos dos usuários"
          onClick={() => setSubscriptionModalOpen(true)}
        />
        <ActionCard
          icon="📊"
          title="Estatísticas"
          description="Ver estatísticas de assinaturas"
          onClick={() => setSubscriptionModalOpen(true)}
        />
        <ActionCard
          icon="🆓"
          title="Usuários Free"
          description="Ver usuários com conta gratuita"
          onClick={() => setSubscriptionModalOpen(true)}
        />
        <ActionCard
          icon="💎"
          title="Usuários Premium"
          description="Ver usuários com planos pagos"
          onClick={() => setSubscriptionModalOpen(true)}
        />
      </div>
    </div>
  )

  const RelatoriosSection = () => (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>📊 Relatórios</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Visualize estatísticas e relatórios do sistema.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <ActionCard
          icon="📈"
          title="Usuários Ativos"
          description="Relatório de atividade"
          onClick={() => alert('📊 Função: Usuários Ativos')}
        />
        <ActionCard
          icon="📋"
          title="Logs do Sistema"
          description="Visualizar logs de auditoria"
          onClick={() => alert('📊 Função: Logs do Sistema')}
        />
        <ActionCard
          icon="💾"
          title="Exportar Dados"
          description="Exportar relatórios"
          onClick={() => alert('📊 Função: Exportar Dados')}
        />
      </div>
    </div>
  )

  const ConfiguracoesSection = () => (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>🔧 Configurações</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Configure parâmetros gerais do sistema.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <ActionCard
          icon="⚙️"
          title="Configurações Gerais"
          description="Parâmetros do sistema"
          onClick={() => alert('🔧 Função: Configurações Gerais')}
        />
        <ActionCard
          icon="🔐"
          title="Segurança"
          description="Configurações de segurança"
          onClick={() => alert('🔧 Função: Segurança')}
        />
        <ActionCard
          icon="📧"
          title="Notificações"
          description="Configurar notificações"
          onClick={() => alert('🔧 Função: Notificações')}
        />
      </div>
    </div>
  )

  const RolesSection = () => (
    <OwnerOnly>
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: '#7c3aed' }}>🔑 Gerenciar Roles</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Controle total sobre roles e permissões do sistema.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ActionCard
            icon="👑"
            title="Atribuir Owner"
            description="Tornar usuário proprietário"
            onClick={() => {
              setUserModalMode('assign')
              setUserModalTitle('👑 Atribuir Owner')
              setUserModalOpen(true)
            }}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="🛡️"
            title="Gerenciar Admins"
            description="Adicionar/remover admins"
            onClick={() => {
              setUserModalMode('manage')
              setUserModalTitle('🛡️ Gerenciar Admins')
              setUserModalOpen(true)
            }}
            isOwnerOnly={true}
          />
          <ActionCard
            icon="📋"
            title="Histórico de Roles"
            description="Ver mudanças de permissões"
            onClick={() => {
              setUserModalMode('list')
              setUserModalTitle('📋 Histórico de Roles')
              setUserModalOpen(true)
            }}
            isOwnerOnly={true}
          />
        </div>
      </div>
    </OwnerOnly>
  )

  const SistemaSection = () => (
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

  const BackupSection = () => (
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
              <UserRoleBadge />
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
                  icon="💳"
                  label="Assinaturas"
                  active={activeSection === 'assinaturas'}
                  onClick={() => setActiveSection('assinaturas')}
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
            {activeSection === 'usuarios' && <UsuariosSection />}
            {activeSection === 'assinaturas' && <AssinaturasSection />}
            {activeSection === 'relatorios' && <RelatoriosSection />}
            {activeSection === 'configuracoes' && <ConfiguracoesSection />}
            {activeSection === 'roles' && <RolesSection />}
            {activeSection === 'sistema' && <SistemaSection />}
            {activeSection === 'backup' && <BackupSection />}
          </div>
        </div>
      </div>

      {/* Modais */}
      <UserManagementModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        mode={userModalMode}
        title={userModalTitle}
      />

      <SubscriptionManagementModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
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